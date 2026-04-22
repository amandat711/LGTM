const express = require('express');
const router = express.Router();
const db = require('../config/db');

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

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

          if (Number(availability.created_by) === Number(booked_by)) {
            return res.status(400).json({
              error: 'You cannot book your own availability'
            });
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
                        created_by,
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
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                    `;
                  db.run(
                    insertAppointment,
                    [
                    null,
                    booked_by,
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

router.post('/direct', (req, res) => {
  const {
    created_by,
    course_id,
    start_time,
    end_time,
    location,
    capacity,
    visibility,
    ap_title,
    ap_description,
    scheduling_mode,
    status,
  } = req.body || {};

  if (!created_by || !start_time || !end_time) {
    return res.status(400).json({
      error: 'created_by, start_time, and end_time are required',
    });
  }

  const hostId = Number(created_by);
  if (!Number.isInteger(hostId) || hostId < 1) {
    return res.status(400).json({ error: 'created_by must be a positive integer' });
  }

  const parsedCourseId =
    course_id === undefined || course_id === null || course_id === ''
      ? null
      : Number(course_id);
  if (parsedCourseId != null && (!Number.isInteger(parsedCourseId) || parsedCourseId < 1)) {
    return res.status(400).json({ error: 'course_id must be a positive integer or null' });
  }

  const finalCapacity = capacity == null ? 1 : Number(capacity);
  if (!Number.isInteger(finalCapacity) || finalCapacity < 1) {
    return res.status(400).json({ error: 'capacity must be a positive integer' });
  }

  const finalVisibility = visibility || 'private';
  if (!['public', 'private'].includes(finalVisibility)) {
    return res.status(400).json({ error: 'visibility must be public or private' });
  }

  const finalSchedulingMode = scheduling_mode || 'calendar';
  if (!['calendar', 'heatmap', 'direct_request'].includes(finalSchedulingMode)) {
    return res.status(400).json({ error: 'scheduling_mode is invalid' });
  }

  const finalStatus = status || 'confirmed';
  if (!['pending', 'waiting_confirmation', 'confirmed', 'cancelled', 'rescheduled'].includes(finalStatus)) {
    return res.status(400).json({ error: 'status is invalid' });
  }

  const startDate = parseDate(start_time);
  const endDate = parseDate(end_time);
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'start_time and end_time must be valid datetimes' });
  }
  if (endDate <= startDate) {
    return res.status(400).json({ error: 'end_time must be after start_time' });
  }

  db.get('SELECT user_id FROM users WHERE user_id = ?', [hostId], (hostErr, hostRow) => {
    if (hostErr) return res.status(500).json({ error: hostErr.message });
    if (!hostRow) return res.status(404).json({ error: 'Host user not found' });

    const continueInsert = () => {
      db.run(
        `INSERT INTO appointments
          (
            course_id,
            created_by,
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
          VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          parsedCourseId,
          hostId,
          finalCapacity,
          location || null,
          start_time,
          end_time,
          finalVisibility,
          ap_title || null,
          ap_description || null,
          finalSchedulingMode,
          finalStatus,
        ],
        function onInsert(insertErr) {
          if (insertErr) return res.status(500).json({ error: insertErr.message });

          const appointmentId = this.lastID;
          db.run(
            `INSERT INTO appointment_participants
              (appointment_id, user_id, participant_role, response_status)
              VALUES (?, ?, 'host', 'accepted')`,
            [appointmentId, hostId],
            (partErr) => {
              if (partErr) return res.status(500).json({ error: partErr.message });

              db.run(
                `INSERT INTO appointment_history
                  (appointment_id, changed_by, old_status, new_status, changed_at, note)
                  VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)`,
                [appointmentId, hostId, null, finalStatus, 'Appointment created directly'],
                (historyErr) => {
                  if (historyErr) return res.status(500).json({ error: historyErr.message });

                  db.get(
                    'SELECT * FROM appointments WHERE appointment_id = ?',
                    [appointmentId],
                    (getErr, appointmentRow) => {
                      if (getErr) return res.status(500).json({ error: getErr.message });
                      return res.status(201).json({
                        message: 'Appointment created successfully',
                        appointment: appointmentRow,
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    };

    if (parsedCourseId == null) {
      return continueInsert();
    }

    db.get('SELECT course_id FROM courses WHERE course_id = ?', [parsedCourseId], (courseErr, courseRow) => {
      if (courseErr) return res.status(500).json({ error: courseErr.message });
      if (!courseRow) return res.status(404).json({ error: 'Course not found' });
      continueInsert();
    });
  });
});

router.get('/my', (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const query = `
    SELECT DISTINCT a.*
    FROM appointments a
    JOIN appointment_participants ap
      ON a.appointment_id = ap.appointment_id
    WHERE ap.user_id = ?
    ORDER BY datetime(a.start_time) ASC
  `;

  db.all(query, [user_id], (err, appointments) => {
    if (err) return res.status(500).json({ error: err.message });

    if (appointments.length === 0) {
      return res.json([]);
    }

    const appointmentIds = appointments.map(a => a.appointment_id);
    const placeholders = appointmentIds.map(() => '?').join(',');

    const participantsQuery = `
      SELECT
        ap.appointment_id,
        ap.user_id,
        ap.participant_role,
        ap.response_status,
        u.first_name,
        u.last_name,
        u.mcgill_email,
        u.user_type
      FROM appointment_participants ap
      JOIN users u
        ON ap.user_id = u.user_id
      WHERE ap.appointment_id IN (${placeholders})
    `;

    db.all(participantsQuery, appointmentIds, (err, participants) => {
      if (err) return res.status(500).json({ error: err.message });

      const result = appointments.map(appt => ({
        ...appt,
        participants: participants.filter(
          p => p.appointment_id === appt.appointment_id
        )
      }));

      res.json(result);
    });
  });
});

router.get('/hosting', (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const query = `
    SELECT DISTINCT a.*
    FROM appointments a
    JOIN appointment_participants ap
      ON a.appointment_id = ap.appointment_id
    WHERE ap.user_id = ?
      AND ap.participant_role = 'host'
    ORDER BY datetime(a.start_time) ASC
  `;

  db.all(query, [user_id], (err, appointments) => {
    if (err) return res.status(500).json({ error: err.message });

    if (appointments.length === 0) {
      return res.json([]);
    }

    const appointmentIds = appointments.map(a => a.appointment_id);
    const placeholders = appointmentIds.map(() => '?').join(',');

    const participantsQuery = `
      SELECT
        ap.appointment_id,
        ap.user_id,
        ap.participant_role,
        ap.response_status,
        u.first_name,
        u.last_name,
        u.mcgill_email,
        u.user_type
      FROM appointment_participants ap
      JOIN users u
        ON ap.user_id = u.user_id
      WHERE ap.appointment_id IN (${placeholders})
    `;

    db.all(participantsQuery, appointmentIds, (err, participants) => {
      if (err) return res.status(500).json({ error: err.message });

      const result = appointments.map(appt => ({
        ...appt,
        participants: participants.filter(
          p => p.appointment_id === appt.appointment_id
        )
      }));

      res.json(result);
    });
  });
});

router.get('/attending', (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const query = `
    SELECT DISTINCT a.*
    FROM appointments a
    JOIN appointment_participants ap
      ON a.appointment_id = ap.appointment_id
    WHERE ap.user_id = ?
      AND ap.participant_role = 'attendee'
    ORDER BY datetime(a.start_time) ASC
  `;

  db.all(query, [user_id], (err, appointments) => {
    if (err) return res.status(500).json({ error: err.message });

    if (appointments.length === 0) {
      return res.json([]);
    }

    const appointmentIds = appointments.map(a => a.appointment_id);
    const placeholders = appointmentIds.map(() => '?').join(',');

    const participantsQuery = `
      SELECT
        ap.appointment_id,
        ap.user_id,
        ap.participant_role,
        ap.response_status,
        u.first_name,
        u.last_name,
        u.mcgill_email,
        u.user_type
      FROM appointment_participants ap
      JOIN users u
        ON ap.user_id = u.user_id
      WHERE ap.appointment_id IN (${placeholders})
    `;

    db.all(participantsQuery, appointmentIds, (err, participants) => {
      if (err) return res.status(500).json({ error: err.message });

      const result = appointments.map(appt => ({
        ...appt,
        participants: participants.filter(
          p => p.appointment_id === appt.appointment_id
        )
      }));

      res.json(result);
    });
  });
});

router.patch('/:id/cancel', (req, res) => {
  const appointmentId = req.params.id;
  const { changed_by, note } = req.body;

  if (!changed_by) {
    return res.status(400).json({
      error: 'changed_by is required'
    });
  }

  // 1. Check appointment exists
  db.get(
    `SELECT * FROM appointments WHERE appointment_id = ?`,
    [appointmentId],
    (err, appointment) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!appointment) {
        return res.status(404).json({ error: 'Appointment not found' });
      }

      if (appointment.status === 'cancelled') {
        return res.status(400).json({
          error: 'Appointment is already cancelled'
        });
      }

      const oldStatus = appointment.status;

      // 2. Update status
      db.run(
        `
        UPDATE appointments
        SET status = 'cancelled'
        WHERE appointment_id = ?
        `,
        [appointmentId],
        function (err) {
          if (err) return res.status(500).json({ error: err.message });

          // 3. Add history entry
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
              changed_by,
              oldStatus,
              'cancelled',
              note || 'Appointment cancelled'
            ],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });

              // 4. Return updated appointment
              db.get(
                `SELECT * FROM appointments WHERE appointment_id = ?`,
                [appointmentId],
                (err, updatedAppointment) => {
                  if (err) return res.status(500).json({ error: err.message });

                  res.json({
                    message: 'Appointment cancelled successfully',
                    appointment: updatedAppointment
                  });
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

// TODO: join users table, so dashboard shows names and email
