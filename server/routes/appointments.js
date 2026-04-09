const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/', (req, res) => {
  const { availability_id, booked_by } = req.body;

  if (!availability_id || !booked_by) {
    return res.status(400).json({
      error: 'availability_id and booked_by are required'
    });
  }

  // Check booking user exists
  db.get(
    `SELECT user_id, user_type FROM users WHERE user_id = ?`,
    [booked_by],
    (err, bookingUser) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!bookingUser) {
        return res.status(404).json({ error: 'Booking user not found' });
      }

      // Fetch availability
      db.get(
        `SELECT * FROM availabilities WHERE availability_id = ?`,
        [availability_id],
        (err, availability) => {
          if (err) return res.status(500).json({ error: err.message });

          if (!availability) {
            return res.status(404).json({ error: 'Availability not found' });
          }

          // Check visibility
          if (availability.visibility !== 'public') {
            return res.status(403).json({
              error: 'This slot is not publicly bookable'
            });
          }

          // Check future slot
          const now = new Date();
          const start = new Date(availability.start_time);
          if (isNaN(start.getTime()) || start <= now) {
            return res.status(400).json({
              error: 'Cannot book a past or started slot'
            });
          }

          // Count how many active appointments already use this availability
          db.get(
            `
            SELECT COUNT(*) AS booking_count
            FROM appointments
            WHERE created_from_availability = ?
              AND status != 'cancelled'
            `,
            [availability_id],
            (err, countRow) => {
              if (err) return res.status(500).json({ error: err.message });

              const bookingCount = countRow.booking_count;

              if (bookingCount >= availability.capacity) {
                return res.status(400).json({
                  error: 'This slot is already full'
                });
              }

              // Prevent same user from booking same availability twice
              db.get(
                `
                SELECT a.appointment_id
                FROM appointments a
                JOIN appointment_participants ap
                  ON a.appointment_id = ap.appointment_id
                WHERE a.created_from_availability = ?
                  AND ap.user_id = ?
                  AND ap.participant_role = 'attendee'
                  AND a.status != 'cancelled'
                `,
                [availability_id, booked_by],
                (err, existingBooking) => {
                  if (err) return res.status(500).json({ error: err.message });

                  if (existingBooking) {
                    return res.status(400).json({
                      error: 'User already booked this slot'
                    });
                  }

                  // Create appointment from availability
                  const insertAppointment = `
                    INSERT INTO appointments
                    (
                        course_id,
                        created_from_availability,
                        capacity,
                        location,
                        start_time,
                        end_time,
                        visibility,
                        ap_title,
                        ap_description,
                        scheduling_mode,
                        status
                    )
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                  db.run(
                    insertAppointment,
                    [
                    null,
                    availability.availability_id,
                    availability.capacity,
                    availability.location || null,
                    availability.start_time,
                    availability.end_time,
                    availability.visibility || 'private',
                    availability.av_title || 'Booked Appointment',
                    availability.av_description || null,
                    'calendar',
                    'confirmed'
                    ],
                    function (err) {
                      if (err) return res.status(500).json({ error: err.message });

                      const appointmentId = this.lastID;

                      // Insert host participant
                      db.run(
                        `
                        INSERT INTO appointment_participants
                        (appointment_id, user_id, participant_role, response_status)
                        VALUES (?, ?, ?, ?)
                        `,
                        [appointmentId, availability.created_by, 'host', 'accepted'],
                        (err) => {
                          if (err) return res.status(500).json({ error: err.message });

                          // Insert attendee participant
                          db.run(
                            `
                            INSERT INTO appointment_participants
                            (appointment_id, user_id, participant_role, response_status)
                            VALUES (?, ?, ?, ?)
                            `,
                            [appointmentId, booked_by, 'attendee', 'accepted'],
                            (err) => {
                              if (err) return res.status(500).json({ error: err.message });

                              // Add history row
                              db.run(
                                `
                                INSERT INTO appointment_history
                                (
                                  appointment_id,
                                  changed_by,
                                  old_status,
                                  new_status,
                                  changed_at,
                                  note
                                )
                                VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                                `,
                                [
                                  appointmentId,
                                  booked_by,
                                  null,
                                  'confirmed',
                                  'Appointment created from availability booking'
                                ],
                                (err) => {
                                  if (err) return res.status(500).json({ error: err.message });

                                  // Return created appointment
                                  db.get(
                                    `SELECT * FROM appointments WHERE appointment_id = ?`,
                                    [appointmentId],
                                    (err, appointmentRow) => {
                                      if (err) {
                                        return res.status(500).json({ error: err.message });
                                      }

                                      res.status(201).json({
                                        message: 'Appointment booked successfully',
                                        appointment: appointmentRow
                                      });
                                    }
                                  );
                                }
                              );
                            }
                          );
                        }
                      );
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;