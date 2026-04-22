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

router.post('/:id/join', (req, res) => {
  const appointmentId = Number(req.params.id);
  const { user_id } = req.body || {};
  const userId = Number(user_id);

  if (!Number.isInteger(appointmentId) || appointmentId < 1) {
    return res.status(400).json({ error: 'Invalid appointment id' });
  }
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'user_id must be a positive integer' });
  }

  db.get(`SELECT user_id FROM users WHERE user_id = ?`, [userId], (userErr, userRow) => {
    if (userErr) return res.status(500).json({ error: userErr.message });
    if (!userRow) return res.status(404).json({ error: 'User not found' });

    db.get(`SELECT * FROM appointments WHERE appointment_id = ?`, [appointmentId], (apptErr, appt) => {
      if (apptErr) return res.status(500).json({ error: apptErr.message });
      if (!appt) return res.status(404).json({ error: 'Appointment not found' });
      if (appt.status === 'cancelled') {
        return res.status(400).json({ error: 'Cancelled appointments cannot be joined' });
      }
      if (!appt.course_id) {
        return res.status(400).json({ error: 'Only course events can be joined from this endpoint' });
      }
      if (appt.visibility !== 'public') {
        return res.status(403).json({ error: 'Only public course events are joinable' });
      }

      db.get(
        `
        SELECT
          (SELECT COUNT(*) FROM course_admin_assignments ca
            WHERE ca.course_id = ? AND ca.course_admin_id = ? AND ca.status = 'active') AS is_staff,
          (SELECT COUNT(*) FROM course_ownerships co
            WHERE co.course_id = ? AND co.general_admin_id = ? AND co.status = 'active') AS is_owner,
          (SELECT COUNT(*) FROM course_enrollments ce
            WHERE ce.course_id = ? AND ce.user_id = ? AND ce.enrollment_status IN ('active', 'completed')) AS is_enrolled
        `,
        [appt.course_id, userId, appt.course_id, userId, appt.course_id, userId],
        (roleErr, roleRow) => {
          if (roleErr) return res.status(500).json({ error: roleErr.message });

          const isStaff = Number(roleRow?.is_staff) > 0;
          const isOwner = Number(roleRow?.is_owner) > 0;
          const isEnrolled = Number(roleRow?.is_enrolled) > 0;

          if (isStaff || isOwner) {
            return res.status(403).json({ error: 'Course staff cannot join course events as attendees' });
          }
          if (!isEnrolled) {
            return res.status(403).json({ error: 'Only enrolled students can join course events' });
          }

          db.get(
            `SELECT participant_role FROM appointment_participants WHERE appointment_id = ? AND user_id = ?`,
            [appointmentId, userId],
            (existingErr, existing) => {
              if (existingErr) return res.status(500).json({ error: existingErr.message });
              if (existing) {
                return res.status(400).json({
                  error:
                    existing.participant_role === 'host'
                      ? 'Hosts cannot join as attendees'
                      : 'You have already joined this event',
                });
              }

              db.get(
                `
                SELECT COUNT(*) AS attendee_count
                FROM appointment_participants
                WHERE appointment_id = ?
                  AND participant_role = 'attendee'
                  AND (response_status IS NULL OR response_status != 'declined')
                `,
                [appointmentId],
                (countErr, countRow) => {
                  if (countErr) return res.status(500).json({ error: countErr.message });

                  if (Number(countRow?.attendee_count || 0) >= Number(appt.capacity || 1)) {
                    return res.status(400).json({ error: 'This event is full' });
                  }

                  db.run(
                    `
                    INSERT INTO appointment_participants
                      (appointment_id, user_id, participant_role, response_status)
                    VALUES (?, ?, 'attendee', 'accepted')
                    `,
                    [appointmentId, userId],
                    (insertErr) => {
                      if (insertErr) return res.status(500).json({ error: insertErr.message });

                      db.run(
                        `
                        INSERT INTO appointment_history
                          (appointment_id, changed_by, old_status, new_status, changed_at, note)
                        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
                        `,
                        [appointmentId, userId, appt.status, appt.status, 'Student joined course event'],
                        (histErr) => {
                          if (histErr) return res.status(500).json({ error: histErr.message });

                          return res.status(201).json({
                            message: 'Joined event successfully',
                            appointment_id: appointmentId,
                            user_id: userId,
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
    });
  });
});

router.patch('/:id', (req, res) => {
  const appointmentId = Number(req.params.id);
  const {
    changed_by,
    start_time,
    end_time,
    location,
    capacity,
    visibility,
    ap_title,
    ap_description,
    note,
  } = req.body || {};

  if (!Number.isInteger(appointmentId) || appointmentId < 1) {
    return res.status(400).json({ error: 'Invalid appointment id' });
  }

  if (!changed_by) {
    return res.status(400).json({ error: 'changed_by is required' });
  }

  const changedBy = Number(changed_by);
  if (!Number.isInteger(changedBy) || changedBy < 1) {
    return res.status(400).json({ error: 'changed_by must be a positive integer' });
  }

  const startDate = parseDate(start_time);
  const endDate = parseDate(end_time);
  if (!startDate || !endDate) {
    return res.status(400).json({ error: 'start_time and end_time must be valid datetimes' });
  }
  if (endDate <= startDate) {
    return res.status(400).json({ error: 'end_time must be after start_time' });
  }

  const parsedCapacity = capacity == null ? null : Number(capacity);
  if (parsedCapacity != null && (!Number.isInteger(parsedCapacity) || parsedCapacity < 1)) {
    return res.status(400).json({ error: 'capacity must be a positive integer' });
  }

  const finalVisibility = visibility == null ? null : String(visibility);
  if (finalVisibility != null && !['public', 'private'].includes(finalVisibility)) {
    return res.status(400).json({ error: 'visibility must be public or private' });
  }

  db.get(`SELECT * FROM appointments WHERE appointment_id = ?`, [appointmentId], (getErr, existing) => {
    if (getErr) return res.status(500).json({ error: getErr.message });
    if (!existing) return res.status(404).json({ error: 'Appointment not found' });
    if (existing.status === 'cancelled') {
      return res.status(400).json({ error: 'Cancelled appointments cannot be edited' });
    }

    db.run(
      `
      UPDATE appointments
      SET
        start_time = ?,
        end_time = ?,
        location = ?,
        capacity = ?,
        visibility = ?,
        ap_title = ?,
        ap_description = ?
      WHERE appointment_id = ?
      `,
      [
        start_time,
        end_time,
        location == null || location === '' ? null : String(location),
        parsedCapacity == null ? Number(existing.capacity || 1) : parsedCapacity,
        finalVisibility == null ? existing.visibility : finalVisibility,
        ap_title == null || ap_title === '' ? null : String(ap_title),
        ap_description == null || ap_description === '' ? null : String(ap_description),
        appointmentId,
      ],
      (updateErr) => {
        if (updateErr) return res.status(500).json({ error: updateErr.message });

        db.run(
          `
          INSERT INTO appointment_history
          (
            appointment_id,
            changed_by,
            old_status,
            new_status,
            old_start_time,
            new_start_time,
            old_end_time,
            new_end_time,
            changed_at,
            note
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
          `,
          [
            appointmentId,
            changedBy,
            existing.status,
            existing.status,
            existing.start_time,
            start_time,
            existing.end_time,
            end_time,
            note || 'Appointment details updated',
          ],
          (histErr) => {
            if (histErr) return res.status(500).json({ error: histErr.message });

            db.get(
              `SELECT * FROM appointments WHERE appointment_id = ?`,
              [appointmentId],
              (finalErr, appointment) => {
                if (finalErr) return res.status(500).json({ error: finalErr.message });
                return res.json({
                  message: 'Appointment updated successfully',
                  appointment,
                });
              }
            );
          }
        );
      }
    );
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
