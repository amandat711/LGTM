const express = require('express');
const router = express.Router();
const db = require('../config/db');

const {
  parseDate,
  toSqliteDateTime,
  parseAndValidateWeeklyRecurrenceRule,
  expandOccurrences,
} = require('../utils/recurrence');

function normalizeCourseId(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return 'invalid';
  return n;
}

function normalizeInviteeIds(input) {
  if (input == null) return [];
  if (!Array.isArray(input)) return 'invalid';
  const ids = input.map((v) => Number(v)).filter((n) => Number.isInteger(n));
  if (ids.length !== input.length) return 'invalid';
  return ids;
}

function uniqueInts(ints) {
  const seen = new Set();
  const out = [];
  for (const n of ints) {
    if (!seen.has(n)) {
      seen.add(n);
      out.push(n);
    }
  }
  return out;
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
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
                    availability.course_id ?? null,
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

router.post('/direct', async (req, res) => {
  const {
    created_by,
    course_id: bodyCourseId,
    start_time,
    end_time,
    location,
    visibility,
    capacity,
    ap_title,
    ap_description,
    invitee_user_ids,
    recurrence_rule,
  } = req.body || {};

  try {
    const courseIdNorm = normalizeCourseId(bodyCourseId);
    if (courseIdNorm === 'invalid') {
      return res.status(400).json({ error: 'course_id must be a positive integer or null/omitted.' });
    }

    if (!created_by || !start_time || !end_time) {
      return res.status(400).json({
        error: 'created_by, start_time, and end_time are required',
      });
    }

    const creatorId = Number(created_by);
    if (!Number.isInteger(creatorId) || creatorId < 1) {
      return res.status(400).json({ error: 'created_by must be a positive integer' });
    }

    const finalCapacity = capacity ?? 1;
    if (!Number.isInteger(finalCapacity) || finalCapacity < 1) {
      return res.status(400).json({ error: 'capacity must be >= 1' });
    }

    const finalVisibility = visibility ?? 'private';
    if (!['public', 'private'].includes(finalVisibility)) {
      return res.status(400).json({ error: 'visibility must be public or private' });
    }

    const startDate = parseDate(start_time);
    const endDate = parseDate(end_time);
    if (!startDate || !endDate) {
      return res.status(400).json({ error: 'start_time and end_time must be valid datetimes' });
    }
    if (endDate <= startDate) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }

    const inviteeIdsNorm = normalizeInviteeIds(invitee_user_ids);
    if (inviteeIdsNorm === 'invalid') {
      return res.status(400).json({ error: 'invitee_user_ids must be an array of integers' });
    }

    const uniqueInvitees = uniqueInts(inviteeIdsNorm);
    if (uniqueInvitees.length !== inviteeIdsNorm.length) {
      return res.status(400).json({ error: 'Duplicate invitees are not allowed' });
    }

    if (uniqueInvitees.some((id) => id === creatorId)) {
      return res.status(400).json({ error: 'You cannot invite yourself' });
    }

    const creator = await dbGet(`SELECT user_id, user_type FROM users WHERE user_id = ?`, [
      creatorId,
    ]);
    if (!creator) {
      return res.status(404).json({ error: 'Creator not found' });
    }
    if (!['course_admin', 'general_admin'].includes(creator.user_type)) {
      return res.status(403).json({ error: 'Not allowed to create direct appointments' });
    }

    if (uniqueInvitees.length > 0) {
      const placeholders = uniqueInvitees.map(() => '?').join(',');
      const invitees = await dbAll(
        `SELECT user_id FROM users WHERE user_id IN (${placeholders})`,
        uniqueInvitees
      );
      if (invitees.length !== uniqueInvitees.length) {
        return res.status(404).json({ error: 'One or more invitees were not found' });
      }
    }

    let parsedRecurrence = null;
    let recurrenceRuleForDb = null;
    try {
      const parsed = parseAndValidateWeeklyRecurrenceRule(recurrence_rule);
      parsedRecurrence = parsed.rule;
      recurrenceRuleForDb = parsed.ruleForDb;
    } catch (e) {
      const code = e.statusCode || 500;
      return res.status(code).json({ error: e.message });
    }

    const occurrences = expandOccurrences({
      baseStartDate: startDate,
      baseEndDate: endDate,
      recurrenceRule: parsedRecurrence,
    });

    if (!occurrences.length) {
      return res.status(400).json({ error: 'No occurrences could be generated' });
    }

    const overlapHostedQuery = `
      SELECT a.appointment_id, a.start_time, a.end_time
      FROM appointments a
      JOIN appointment_participants ap
        ON a.appointment_id = ap.appointment_id
      WHERE ap.user_id = ?
        AND ap.participant_role = 'host'
        AND a.status != 'cancelled'
        AND datetime(a.start_time) < datetime(?)
        AND datetime(a.end_time) > datetime(?)
      LIMIT 1
    `;

    const overlapAvailabilityQuery = `
      SELECT availability_id, start_time, end_time
      FROM availabilities
      WHERE created_by = ?
        AND datetime(start_time) < datetime(?)
        AND datetime(end_time) > datetime(?)
      LIMIT 1
    `;

    for (const occ of occurrences) {
      const occStart = toSqliteDateTime(occ.start);
      const occEnd = toSqliteDateTime(occ.end);

      const overlapAppt = await dbGet(overlapHostedQuery, [creatorId, occEnd, occStart]);
      if (overlapAppt) {
        return res.status(400).json({
          error: 'Direct appointment overlaps with an existing hosted appointment',
          conflicting_occurrence: { start_time: occStart, end_time: occEnd },
          existing_appointment: overlapAppt,
        });
      }

      const overlapAv = await dbGet(overlapAvailabilityQuery, [creatorId, occEnd, occStart]);
      if (overlapAv) {
        return res.status(400).json({
          error: 'Direct appointment overlaps with an existing availability',
          conflicting_occurrence: { start_time: occStart, end_time: occEnd },
          existing_availability: overlapAv,
        });
      }
    }

    await dbRun('BEGIN');
    const createdAppointmentIds = [];

    try {
      for (const occ of occurrences) {
        const occStart = toSqliteDateTime(occ.start);
        const occEnd = toSqliteDateTime(occ.end);

        const insert = await dbRun(
          `
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
          VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          `,
          [
            courseIdNorm,
            finalCapacity,
            location || null,
            occStart,
            occEnd,
            finalVisibility,
            ap_title || null,
            ap_description || null,
            'calendar',
            'confirmed',
          ]
        );

        const appointmentId = insert.lastID;
        createdAppointmentIds.push(appointmentId);

        await dbRun(
          `
          INSERT INTO appointment_participants
          (appointment_id, user_id, participant_role, response_status)
          VALUES (?, ?, 'host', 'accepted')
          `,
          [appointmentId, creatorId]
        );

        for (const inviteeId of uniqueInvitees) {
          await dbRun(
            `
            INSERT INTO appointment_participants
            (appointment_id, user_id, participant_role, response_status)
            VALUES (?, ?, 'attendee', 'pending')
            `,
            [appointmentId, inviteeId]
          );

          await dbRun(
            `
            INSERT INTO invitations
            (appointment_id, inviter_user_id, invitee_user_id, status)
            VALUES (?, ?, ?, 'sent')
            `,
            [appointmentId, creatorId, inviteeId]
          );
        }

        await dbRun(
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
            creatorId,
            null,
            'confirmed',
            null,
            occStart,
            null,
            occEnd,
            parsedRecurrence?.enabled
              ? `Direct appointment created (recurring)${recurrenceRuleForDb ? `: ${recurrenceRuleForDb}` : ''}`
              : 'Direct appointment created',
          ]
        );
      }

      await dbRun('COMMIT');
    } catch (e) {
      await dbRun('ROLLBACK');
      throw e;
    }

    const placeholders = createdAppointmentIds.map(() => '?').join(',');
    const createdAppointments = await dbAll(
      `SELECT * FROM appointments WHERE appointment_id IN (${placeholders}) ORDER BY datetime(start_time) ASC`,
      createdAppointmentIds
    );

    return res.status(201).json({
      message: 'Direct appointment(s) created successfully',
      created_count: createdAppointments.length,
      recurrence_applied: Boolean(parsedRecurrence?.enabled),
      appointments: createdAppointments,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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

router.get('/invitations/my', (req, res) => {
  const { user_id } = req.query;

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const query = `
    SELECT
      i.*,
      a.start_time,
      a.end_time,
      a.location,
      a.visibility,
      a.ap_title,
      a.ap_description,
      a.status AS appointment_status,
      u.first_name AS inviter_first_name,
      u.last_name AS inviter_last_name,
      u.mcgill_email AS inviter_email
    FROM invitations i
    JOIN appointments a
      ON i.appointment_id = a.appointment_id
    JOIN users u
      ON i.inviter_user_id = u.user_id
    WHERE i.invitee_user_id = ?
      AND i.status IN ('sent')
      AND a.status != 'cancelled'
    ORDER BY datetime(a.start_time) ASC
  `;

  db.all(query, [user_id], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows);
  });
});

router.patch('/invitations/:id/accept', (req, res) => {
  const invitationId = req.params.id;
  const { user_id } = req.body || {};

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  db.get(
    `SELECT * FROM invitations WHERE invitation_id = ?`,
    [invitationId],
    (err, invitation) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

      if (Number(invitation.invitee_user_id) !== Number(user_id)) {
        return res.status(403).json({ error: 'Not allowed to accept this invitation' });
      }

      db.run(
        `UPDATE invitations SET status = 'accepted' WHERE invitation_id = ?`,
        [invitationId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          db.run(
            `
            UPDATE appointment_participants
            SET response_status = 'accepted'
            WHERE appointment_id = ?
              AND user_id = ?
              AND participant_role = 'attendee'
            `,
            [invitation.appointment_id, user_id],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });

              db.get(
                `SELECT * FROM invitations WHERE invitation_id = ?`,
                [invitationId],
                (err, updated) => {
                  if (err) return res.status(500).json({ error: err.message });
                  return res.json({ message: 'Invitation accepted', invitation: updated });
                }
              );
            }
          );
        }
      );
    }
  );
});

router.patch('/invitations/:id/decline', (req, res) => {
  const invitationId = req.params.id;
  const { user_id } = req.body || {};

  if (!user_id) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  db.get(
    `SELECT * FROM invitations WHERE invitation_id = ?`,
    [invitationId],
    (err, invitation) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!invitation) return res.status(404).json({ error: 'Invitation not found' });

      if (Number(invitation.invitee_user_id) !== Number(user_id)) {
        return res.status(403).json({ error: 'Not allowed to decline this invitation' });
      }

      db.run(
        `UPDATE invitations SET status = 'declined' WHERE invitation_id = ?`,
        [invitationId],
        (err) => {
          if (err) return res.status(500).json({ error: err.message });

          db.run(
            `
            UPDATE appointment_participants
            SET response_status = 'declined'
            WHERE appointment_id = ?
              AND user_id = ?
              AND participant_role = 'attendee'
            `,
            [invitation.appointment_id, user_id],
            (err) => {
              if (err) return res.status(500).json({ error: err.message });

              db.get(
                `SELECT * FROM invitations WHERE invitation_id = ?`,
                [invitationId],
                (err, updated) => {
                  if (err) return res.status(500).json({ error: err.message });
                  return res.json({ message: 'Invitation declined', invitation: updated });
                }
              );
            }
          );
        }
      );
    }
  );
});

router.get('/:id', (req, res) => {
  const appointmentId = req.params.id;

  db.get(
    `SELECT * FROM appointments WHERE appointment_id = ?`,
    [appointmentId],
    (err, appointment) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!appointment) return res.status(404).json({ error: 'Appointment not found' });

      db.all(
        `
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
        WHERE ap.appointment_id = ?
        ORDER BY ap.participant_role ASC, lower(u.last_name) ASC, lower(u.first_name) ASC
        `,
        [appointmentId],
        (e2, participants) => {
          if (e2) return res.status(500).json({ error: e2.message });

          db.all(
            `
            SELECT
              i.*,
              inviter.first_name AS inviter_first_name,
              inviter.last_name AS inviter_last_name,
              inviter.mcgill_email AS inviter_email,
              invitee.first_name AS invitee_first_name,
              invitee.last_name AS invitee_last_name,
              invitee.mcgill_email AS invitee_email
            FROM invitations i
            JOIN users inviter
              ON i.inviter_user_id = inviter.user_id
            JOIN users invitee
              ON i.invitee_user_id = invitee.user_id
            WHERE i.appointment_id = ?
            ORDER BY i.invitation_id ASC
            `,
            [appointmentId],
            (e3, invitations) => {
              if (e3) return res.status(500).json({ error: e3.message });

              return res.json({
                appointment,
                participants,
                invitations,
              });
            }
          );
        }
      );
    }
  );
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
