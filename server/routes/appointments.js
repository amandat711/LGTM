// AMANDA TRAN
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { routeLog } = require('../utils/routeLog');
const {
  notifyAttendeesOfOwnerChange,
  notifyHostOfStudentEventResponse,
  notifyHostOfStudentJoin,
  notifyAppointmentCancellation,
  notifyHostOfBookingRequestFromAvailability,
  notifyAttendeesOfHostBookingDecision,
  notifyInviteesOfDirectAppointments,
} = require('../lib/appointmentNotifications');

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

function normalizeRecurrenceScope(scope) {
  if (!scope) return 'single';
  const normalized = String(scope).trim().toLowerCase();
  const allowed = ['single', 'this_and_following', 'all'];
  if (!allowed.includes(normalized)) return null;
  return normalized;
}

function toParticipantStatus(responseStatus) {
  if (responseStatus === 'accepted') return 'confirmed';
  if (responseStatus === 'declined') return 'cancelled';
  return 'pending';
}

function toResponseStatus(participantStatus) {
  if (participantStatus === 'confirmed') return 'accepted';
  if (participantStatus === 'cancelled') return 'declined';
  return 'pending';
}

async function recalculateAppointmentStatus(appointmentId) {
  const appointment = await dbGet(
    `SELECT appointment_id, status FROM appointments WHERE appointment_id = ?`,
    [appointmentId]
  );
  if (!appointment || appointment.status === 'cancelled') return;

  const participants = await dbAll(
    `
    SELECT response_status
    FROM appointment_participants
    WHERE appointment_id = ?
    `,
    [appointmentId]
  );

  // No participants means no workflow; keep it confirmed.
  if (participants.length === 0) {
    if (appointment.status !== 'confirmed') {
      routeLog('appointments', 'appointment_status_recalculated', {
        appointment_id: appointmentId,
        old_status: appointment.status,
        new_status: 'confirmed',
        reason: 'no_participants',
      });
    }
    await dbRun(`UPDATE appointments SET status = 'confirmed' WHERE appointment_id = ?`, [appointmentId]);
    return;
  }

  const anyPending = participants.some((p) => p.response_status === 'pending');
  const anyCancelled = participants.some((p) => p.response_status === 'declined');
  const nextStatus = anyPending ? 'pending' : anyCancelled ? 'cancelled' : 'confirmed';

  if (appointment.status !== nextStatus) {
    routeLog('appointments', 'appointment_status_recalculated', {
      appointment_id: appointmentId,
      old_status: appointment.status,
      new_status: nextStatus,
    });
  }

  await dbRun(`UPDATE appointments SET status = ? WHERE appointment_id = ?`, [nextStatus, appointmentId]);
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
                      'pending'
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
                        [appointmentId, availability.created_by, 'host', 'pending'],
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

                              // Create invitation from student to professor.
                              db.run(
                                `
                                INSERT INTO invitations
                                (appointment_id, inviter_user_id, invitee_user_id, status)
                                VALUES (?, ?, ?, 'sent')
                                `,
                                [appointmentId, booked_by, availability.created_by],
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
                                      'pending',
                                      'Booking request created from availability (awaiting host response)'
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

                                          routeLog('appointments', 'booked_from_availability', {
                                            appointment_id: appointmentId,
                                            booked_by,
                                            availability_id,
                                          });

                                          notifyHostOfBookingRequestFromAvailability({
                                            appointmentId,
                                            bookedByUserId: booked_by,
                                          }).catch((emailErr) => {
                                            console.error('[mailer] booking request to host failed:', emailErr);
                                          });

                                          res.status(201).json({
                                            message: 'Booking request sent successfully',
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
    ap_color,
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
    const finalColor = ap_color == null || String(ap_color).trim() === '' ? '#1565A8' : String(ap_color).trim();
    if (!/^#[0-9A-Fa-f]{6}$/.test(finalColor)) {
      return res.status(400).json({ error: 'ap_color must be a hex color like #1565A8' });
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
    let directSeriesRecurrenceGroupId = null;

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
            ap_color,
            scheduling_mode,
            status,
            recurrence_rule,
            recurrence_group_id
          )
          VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
            finalColor,
            'calendar',
            uniqueInvitees.length > 0 ? 'pending' : 'confirmed',
            recurrenceRuleForDb,
            directSeriesRecurrenceGroupId,
          ]
        );

        const appointmentId = insert.lastID;
        createdAppointmentIds.push(appointmentId);

        if (parsedRecurrence?.enabled && directSeriesRecurrenceGroupId === null) {
          directSeriesRecurrenceGroupId = appointmentId;
          await dbRun(
            `UPDATE appointments SET recurrence_group_id = ? WHERE appointment_id = ?`,
            [directSeriesRecurrenceGroupId, appointmentId]
          );
        }

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

    routeLog('appointments', 'direct_appointments_created', {
      created_by: creatorId,
      created_count: createdAppointments.length,
      appointment_ids: createdAppointmentIds,
      recurrence_applied: Boolean(parsedRecurrence?.enabled),
    });

    if (uniqueInvitees.length > 0) {
      notifyInviteesOfDirectAppointments(createdAppointmentIds, creatorId).catch((emailErr) => {
        console.error('[mailer] direct appointment invite emails failed:', emailErr);
      });
    }

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
    SELECT DISTINCT
      a.*,
      src.recurrence_group_id AS source_recurrence_group_id,
      src.recurrence_instance_date AS source_recurrence_instance_date,
      src.recurrence_rule AS source_recurrence_rule
    FROM appointments a
    JOIN appointment_participants ap
      ON a.appointment_id = ap.appointment_id
    LEFT JOIN appointment_cancellation_dismissals acd
      ON acd.appointment_id = a.appointment_id
      AND acd.user_id = ap.user_id
    LEFT JOIN availabilities src
      ON a.created_from_availability = src.availability_id
    WHERE ap.user_id = ?
      AND (a.status != 'cancelled' OR acd.appointment_id IS NULL)
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
        participants: participants
          .filter((p) => p.appointment_id === appt.appointment_id)
          .map((p) => ({
            ...p,
            participant_status: toParticipantStatus(p.response_status),
          })),
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
    SELECT DISTINCT
      a.*,
      src.recurrence_group_id AS source_recurrence_group_id,
      src.recurrence_instance_date AS source_recurrence_instance_date,
      src.recurrence_rule AS source_recurrence_rule
    FROM appointments a
    JOIN appointment_participants ap
      ON a.appointment_id = ap.appointment_id
    LEFT JOIN appointment_cancellation_dismissals acd
      ON acd.appointment_id = a.appointment_id
      AND acd.user_id = ap.user_id
    LEFT JOIN availabilities src
      ON a.created_from_availability = src.availability_id
    WHERE ap.user_id = ?
      AND ap.participant_role = 'host'
      AND (a.status != 'cancelled' OR acd.appointment_id IS NULL)
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
        participants: participants
          .filter((p) => p.appointment_id === appt.appointment_id)
          .map((p) => ({
            ...p,
            participant_status: toParticipantStatus(p.response_status),
          })),
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
    SELECT DISTINCT
      a.*,
      src.recurrence_group_id AS source_recurrence_group_id,
      src.recurrence_instance_date AS source_recurrence_instance_date,
      src.recurrence_rule AS source_recurrence_rule
    FROM appointments a
    JOIN appointment_participants ap
      ON a.appointment_id = ap.appointment_id
    LEFT JOIN appointment_cancellation_dismissals acd
      ON acd.appointment_id = a.appointment_id
      AND acd.user_id = ap.user_id
    LEFT JOIN availabilities src
      ON a.created_from_availability = src.availability_id
    WHERE ap.user_id = ?
      AND ap.participant_role = 'attendee'
      AND (a.status != 'cancelled' OR acd.appointment_id IS NULL)
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
        participants: participants
          .filter((p) => p.appointment_id === appt.appointment_id)
          .map((p) => ({
            ...p,
            participant_status: toParticipantStatus(p.response_status),
          })),
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

router.patch('/invitations/:id/accept', async (req, res) => {
  const invitationId = Number(req.params.id);
  const { user_id, recurrence_scope, pivot_instance_date } = req.body || {};
  const inviteeUserId = Number(user_id);

  if (!Number.isInteger(invitationId) || invitationId < 1) {
    return res.status(400).json({ error: 'Invalid invitation id' });
  }
  if (!Number.isInteger(inviteeUserId) || inviteeUserId < 1) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const hasScopeInput =
    recurrence_scope !== undefined && recurrence_scope !== null && String(recurrence_scope).trim() !== '';
  const parsedScope = hasScopeInput ? normalizeRecurrenceScope(recurrence_scope) : null;
  if (hasScopeInput && !parsedScope) {
    return res.status(400).json({ error: 'recurrence_scope must be single, this_and_following, or all' });
  }

  try {
    const invitation = await dbGet(
      `
      SELECT
        i.*,
        a.recurrence_group_id,
        a.start_time AS appointment_start_time,
        a.status AS appointment_status
      FROM invitations i
      JOIN appointments a
        ON i.appointment_id = a.appointment_id
      WHERE i.invitation_id = ?
      `,
      [invitationId]
    );

    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (Number(invitation.invitee_user_id) !== inviteeUserId) {
      return res.status(403).json({ error: 'Not allowed to accept this invitation' });
    }
    if (invitation.appointment_status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot accept invitation for a cancelled appointment' });
    }

    const effectiveScope =
      parsedScope || (invitation.recurrence_group_id ? 'all' : 'single');

    let targetInvitations = [];
    if (!invitation.recurrence_group_id || effectiveScope === 'single') {
      targetInvitations = [invitation];
    } else if (effectiveScope === 'all') {
      targetInvitations = await dbAll(
        `
        SELECT i.invitation_id, i.appointment_id
        FROM invitations i
        JOIN appointments a
          ON i.appointment_id = a.appointment_id
        WHERE i.invitee_user_id = ?
          AND i.status = 'sent'
          AND a.status != 'cancelled'
          AND a.recurrence_group_id = ?
        `,
        [inviteeUserId, invitation.recurrence_group_id]
      );
    } else {
      const pivotDate = pivot_instance_date || invitation.appointment_start_time;
      targetInvitations = await dbAll(
        `
        SELECT i.invitation_id, i.appointment_id
        FROM invitations i
        JOIN appointments a
          ON i.appointment_id = a.appointment_id
        WHERE i.invitee_user_id = ?
          AND i.status = 'sent'
          AND a.status != 'cancelled'
          AND a.recurrence_group_id = ?
          AND datetime(a.start_time) >= datetime(?)
        `,
        [inviteeUserId, invitation.recurrence_group_id, pivotDate]
      );
    }

    if (!targetInvitations.length) {
      return res.status(400).json({ error: 'No pending invitations found in selected recurrence scope' });
    }

    const invitationIds = targetInvitations.map((row) => row.invitation_id);
    const appointmentIds = uniqueInts(targetInvitations.map((row) => row.appointment_id));
    const invitePlaceholders = invitationIds.map(() => '?').join(',');
    const appointmentPlaceholders = appointmentIds.map(() => '?').join(',');

    await dbRun('BEGIN');
    try {
      await dbRun(
        `UPDATE invitations SET status = 'accepted' WHERE invitation_id IN (${invitePlaceholders})`,
        invitationIds
      );

      await dbRun(
        `
        UPDATE appointment_participants
        SET response_status = 'accepted'
        WHERE user_id = ?
          AND appointment_id IN (${appointmentPlaceholders})
        `,
        [inviteeUserId, ...appointmentIds]
      );

      await dbRun('COMMIT');
    } catch (e) {
      await dbRun('ROLLBACK');
      throw e;
    }

    for (const apptId of appointmentIds) {
      await recalculateAppointmentStatus(apptId);
    }

    notifyHostOfStudentEventResponse({
      appointmentIds,
      studentUserId: inviteeUserId,
      response: 'accepted',
    }).catch((emailErr) => {
      console.error('[mailer] host notify (invitation accepted) failed:', emailErr);
    });

    const updated = await dbGet(`SELECT * FROM invitations WHERE invitation_id = ?`, [invitationId]);
    routeLog('appointments', 'invitation_accepted', {
      invitation_id: invitationId,
      user_id: inviteeUserId,
      appointment_ids: appointmentIds,
      scope: effectiveScope,
      accepted_count: invitationIds.length,
    });
    return res.json({
      message: 'Invitation accepted',
      invitation: updated,
      scope: effectiveScope,
      accepted_count: invitationIds.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/invitations/:id/decline', async (req, res) => {
  const invitationId = Number(req.params.id);
  const { user_id, recurrence_scope, pivot_instance_date } = req.body || {};
  const inviteeUserId = Number(user_id);

  if (!Number.isInteger(invitationId) || invitationId < 1) {
    return res.status(400).json({ error: 'Invalid invitation id' });
  }
  if (!Number.isInteger(inviteeUserId) || inviteeUserId < 1) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  const hasScopeInput =
    recurrence_scope !== undefined && recurrence_scope !== null && String(recurrence_scope).trim() !== '';
  const parsedScope = hasScopeInput ? normalizeRecurrenceScope(recurrence_scope) : null;
  if (hasScopeInput && !parsedScope) {
    return res.status(400).json({ error: 'recurrence_scope must be single, this_and_following, or all' });
  }

  try {
    const invitation = await dbGet(
      `
      SELECT
        i.*,
        a.recurrence_group_id,
        a.start_time AS appointment_start_time,
        a.status AS appointment_status
      FROM invitations i
      JOIN appointments a
        ON i.appointment_id = a.appointment_id
      WHERE i.invitation_id = ?
      `,
      [invitationId]
    );

    if (!invitation) return res.status(404).json({ error: 'Invitation not found' });
    if (Number(invitation.invitee_user_id) !== inviteeUserId) {
      return res.status(403).json({ error: 'Not allowed to decline this invitation' });
    }
    if (invitation.appointment_status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot decline invitation for a cancelled appointment' });
    }

    const effectiveScope =
      parsedScope || (invitation.recurrence_group_id ? 'all' : 'single');

    let targetInvitations = [];
    if (!invitation.recurrence_group_id || effectiveScope === 'single') {
      targetInvitations = [invitation];
    } else if (effectiveScope === 'all') {
      targetInvitations = await dbAll(
        `
        SELECT i.invitation_id, i.appointment_id
        FROM invitations i
        JOIN appointments a
          ON i.appointment_id = a.appointment_id
        WHERE i.invitee_user_id = ?
          AND i.status = 'sent'
          AND a.status != 'cancelled'
          AND a.recurrence_group_id = ?
        `,
        [inviteeUserId, invitation.recurrence_group_id]
      );
    } else {
      const pivotDate = pivot_instance_date || invitation.appointment_start_time;
      targetInvitations = await dbAll(
        `
        SELECT i.invitation_id, i.appointment_id
        FROM invitations i
        JOIN appointments a
          ON i.appointment_id = a.appointment_id
        WHERE i.invitee_user_id = ?
          AND i.status = 'sent'
          AND a.status != 'cancelled'
          AND a.recurrence_group_id = ?
          AND datetime(a.start_time) >= datetime(?)
        `,
        [inviteeUserId, invitation.recurrence_group_id, pivotDate]
      );
    }

    if (!targetInvitations.length) {
      return res.status(400).json({ error: 'No pending invitations found in selected recurrence scope' });
    }

    const invitationIds = targetInvitations.map((row) => row.invitation_id);
    const appointmentIds = uniqueInts(targetInvitations.map((row) => row.appointment_id));
    const invitePlaceholders = invitationIds.map(() => '?').join(',');
    const appointmentPlaceholders = appointmentIds.map(() => '?').join(',');

    await dbRun('BEGIN');
    try {
      await dbRun(
        `UPDATE invitations SET status = 'declined' WHERE invitation_id IN (${invitePlaceholders})`,
        invitationIds
      );

      await dbRun(
        `
        UPDATE appointment_participants
        SET response_status = 'declined'
        WHERE user_id = ?
          AND appointment_id IN (${appointmentPlaceholders})
        `,
        [inviteeUserId, ...appointmentIds]
      );

      await dbRun('COMMIT');
    } catch (e) {
      await dbRun('ROLLBACK');
      throw e;
    }

    for (const apptId of appointmentIds) {
      await recalculateAppointmentStatus(apptId);
    }

    notifyHostOfStudentEventResponse({
      appointmentIds,
      studentUserId: inviteeUserId,
      response: 'declined',
    }).catch((emailErr) => {
      console.error('[mailer] host notify (invitation declined) failed:', emailErr);
    });

    const updated = await dbGet(`SELECT * FROM invitations WHERE invitation_id = ?`, [invitationId]);
    routeLog('appointments', 'invitation_declined', {
      invitation_id: invitationId,
      user_id: inviteeUserId,
      appointment_ids: appointmentIds,
      scope: effectiveScope,
      declined_count: invitationIds.length,
    });
    return res.json({
      message: 'Invitation declined',
      invitation: updated,
      scope: effectiveScope,
      declined_count: invitationIds.length,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/join', async (req, res) => {
  const appointmentId = Number(req.params.id);
  const userId = Number(req.body?.user_id);

  if (!Number.isInteger(appointmentId) || appointmentId < 1) {
    return res.status(400).json({ error: 'Invalid appointment id' });
  }
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const appointment = await dbGet(
      `
      SELECT appointment_id, capacity, status
      FROM appointments
      WHERE appointment_id = ?
      `,
      [appointmentId]
    );
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot join a cancelled appointment' });
    }

    const existing = await dbGet(
      `
      SELECT appointment_id, user_id, participant_role, response_status
      FROM appointment_participants
      WHERE appointment_id = ? AND user_id = ?
      `,
      [appointmentId, userId]
    );

    if (existing) {
      if (existing.participant_role === 'host') {
        return res.status(400).json({ error: 'Host is already part of this appointment' });
      }
      await dbRun(
        `
        UPDATE appointment_participants
        SET response_status = 'accepted'
        WHERE appointment_id = ? AND user_id = ?
        `,
        [appointmentId, userId]
      );
    } else {
      const counts = await dbGet(
        `
        SELECT
          SUM(CASE WHEN participant_role = 'attendee' AND response_status = 'accepted' THEN 1 ELSE 0 END) AS accepted_count
        FROM appointment_participants
        WHERE appointment_id = ?
        `,
        [appointmentId]
      );
      const acceptedCount = Number(counts?.accepted_count || 0);
      const capacity = Number(appointment.capacity || 1);
      if (acceptedCount >= capacity) {
        return res.status(409).json({ error: 'Appointment is full' });
      }

      await dbRun(
        `
        INSERT INTO appointment_participants
        (appointment_id, user_id, participant_role, response_status)
        VALUES (?, ?, 'attendee', 'accepted')
        `,
        [appointmentId, userId]
      );
    }

    await recalculateAppointmentStatus(appointmentId);

    notifyHostOfStudentJoin({
      appointmentIds: [appointmentId],
      studentUserId: userId,
    }).catch((emailErr) => {
      console.error('[mailer] host notify (join) failed:', emailErr);
    });

    const participant = await dbGet(
      `
      SELECT appointment_id, user_id, participant_role, response_status
      FROM appointment_participants
      WHERE appointment_id = ? AND user_id = ?
      `,
      [appointmentId, userId]
    );

    return res.json({
      message: 'Joined appointment successfully',
      participant: {
        ...participant,
        participant_status: toParticipantStatus(participant.response_status),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/participants/:userId/status', async (req, res) => {
  const appointmentId = Number(req.params.id);
  const participantUserId = Number(req.params.userId);
  const { user_id, status } = req.body || {};
  const requesterUserId = Number(user_id);

  if (!Number.isInteger(appointmentId) || appointmentId < 1) {
    return res.status(400).json({ error: 'Invalid appointment id' });
  }
  if (!Number.isInteger(participantUserId) || participantUserId < 1) {
    return res.status(400).json({ error: 'Invalid participant user id' });
  }
  if (!Number.isInteger(requesterUserId) || requesterUserId < 1) {
    return res.status(400).json({ error: 'user_id is required' });
  }
  if (requesterUserId !== participantUserId) {
    return res.status(403).json({ error: 'You can only update your own status' });
  }
  if (!['pending', 'confirmed', 'cancelled'].includes(status)) {
    return res.status(400).json({ error: 'status must be pending, confirmed, or cancelled' });
  }

  try {
    const appt = await dbGet(`SELECT appointment_id, status FROM appointments WHERE appointment_id = ?`, [appointmentId]);
    if (!appt) return res.status(404).json({ error: 'Appointment not found' });
    if (appt.status === 'cancelled') {
      return res.status(400).json({ error: 'Cannot update participant status on a cancelled appointment' });
    }

    const participant = await dbGet(
      `
      SELECT appointment_id, user_id, participant_role
      FROM appointment_participants
      WHERE appointment_id = ? AND user_id = ?
      `,
      [appointmentId, participantUserId]
    );
    if (!participant) return res.status(404).json({ error: 'Participant not found for this appointment' });
    const responseStatus = toResponseStatus(status);
    await dbRun(
      `
      UPDATE appointment_participants
      SET response_status = ?
      WHERE appointment_id = ? AND user_id = ?
      `,
      [responseStatus, appointmentId, participantUserId]
    );

    await dbRun(
      `
      UPDATE invitations
      SET status = CASE
        WHEN ? = 'pending' THEN 'sent'
        WHEN ? = 'confirmed' THEN 'accepted'
        ELSE 'declined'
      END
      WHERE appointment_id = ? AND invitee_user_id = ?
      `,
      [status, status, appointmentId, participantUserId]
    );

    await recalculateAppointmentStatus(appointmentId);

    const updated = await dbGet(
      `
      SELECT appointment_id, user_id, participant_role, response_status
      FROM appointment_participants
      WHERE appointment_id = ? AND user_id = ?
      `,
      [appointmentId, participantUserId]
    );

    if (
      participant.participant_role !== 'host' &&
      (status === 'confirmed' || status === 'cancelled')
    ) {
      notifyHostOfStudentEventResponse({
        appointmentIds: [appointmentId],
        studentUserId: participantUserId,
        response: status === 'confirmed' ? 'accepted' : 'declined',
      }).catch((emailErr) => {
        console.error('[mailer] host notify (participant status) failed:', emailErr);
      });
    }

    if (
      participant.participant_role === 'host' &&
      (status === 'confirmed' || status === 'cancelled')
    ) {
      notifyAttendeesOfHostBookingDecision({
        appointmentId,
        accepted: status === 'confirmed',
      }).catch((emailErr) => {
        console.error('[mailer] attendee notify (host booking decision) failed:', emailErr);
      });
    }

    routeLog('appointments', 'participant_status_updated', {
      appointment_id: appointmentId,
      participant_user_id: participantUserId,
      status,
    });

    return res.json({
      message: 'Participant status updated',
      participant: {
        ...updated,
        participant_status: toParticipantStatus(updated.response_status),
      },
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
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
          const participantsWithStatus = participants.map((p) => ({
            ...p,
            participant_status: toParticipantStatus(p.response_status),
          }));

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
                participants: participantsWithStatus,
                invitations,
              });
            }
          );
        }
      );
    }
  );
});

router.patch('/:id', async (req, res) => {
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
    ap_color,
    course_id,
    note,
    recurrence_scope,
    pivot_instance_date,
  } = req.body || {};

  if (!Number.isInteger(appointmentId) || appointmentId < 1) {
    return res.status(400).json({ error: 'Invalid appointment id' });
  }
  const changedBy = Number(changed_by);
  if (!Number.isInteger(changedBy) || changedBy < 1) {
    return res.status(400).json({ error: 'changed_by is required' });
  }

  const scope = normalizeRecurrenceScope(recurrence_scope);
  if (!scope) {
    return res.status(400).json({ error: 'recurrence_scope must be single, this_and_following, or all' });
  }

  try {
    const appointment = await dbGet(`SELECT * FROM appointments WHERE appointment_id = ?`, [appointmentId]);
    if (!appointment) return res.status(404).json({ error: 'Appointment not found' });
    if (appointment.status === 'cancelled') {
      return res.status(400).json({ error: 'Cancelled appointments cannot be edited' });
    }

    const host = await dbGet(
      `
      SELECT 1 AS ok
      FROM appointment_participants
      WHERE appointment_id = ?
        AND user_id = ?
        AND participant_role = 'host'
      `,
      [appointmentId, changedBy]
    );
    if (!host) return res.status(403).json({ error: 'Only the host can edit this appointment' });

    const parsedCapacity = capacity === undefined ? undefined : Number(capacity);
    if (parsedCapacity !== undefined && (!Number.isInteger(parsedCapacity) || parsedCapacity < 1)) {
      return res.status(400).json({ error: 'capacity must be a positive integer' });
    }

    if (visibility !== undefined && visibility !== null && !['public', 'private'].includes(String(visibility))) {
      return res.status(400).json({ error: 'visibility must be public or private' });
    }
    if (ap_color !== undefined && ap_color !== null && String(ap_color).trim() !== '') {
      if (!/^#[0-9A-Fa-f]{6}$/.test(String(ap_color).trim())) {
        return res.status(400).json({ error: 'ap_color must be a hex color like #1565A8' });
      }
    }

    const parsedCourseId = course_id === undefined ? undefined : normalizeCourseId(course_id);
    if (parsedCourseId === 'invalid') {
      return res.status(400).json({ error: 'course_id must be a positive integer or null/omitted.' });
    }

    let parsedStartIso;
    if (start_time !== undefined) {
      const parsed = parseDate(start_time);
      if (!parsed) return res.status(400).json({ error: 'start_time must be a valid datetime' });
      parsedStartIso = toSqliteDateTime(parsed);
    }

    let parsedEndIso;
    if (end_time !== undefined) {
      const parsed = parseDate(end_time);
      if (!parsed) return res.status(400).json({ error: 'end_time must be a valid datetime' });
      parsedEndIso = toSqliteDateTime(parsed);
    }

    const nextStart = parsedStartIso || appointment.start_time;
    const nextEnd = parsedEndIso || appointment.end_time;
    if (new Date(nextEnd) <= new Date(nextStart)) {
      return res.status(400).json({ error: 'end_time must be after start_time' });
    }

    const hasRecurringSeries = Number(appointment.recurrence_group_id) > 0;
    let targetWhere = 'appointment_id = ?';
    let targetParams = [appointmentId];
    if (hasRecurringSeries && scope !== 'single') {
      if (scope === 'all') {
        targetWhere = 'recurrence_group_id = ?';
        targetParams = [appointment.recurrence_group_id];
      } else {
        const pivotDate = pivot_instance_date || appointment.start_time;
        targetWhere = 'recurrence_group_id = ? AND datetime(start_time) >= datetime(?)';
        targetParams = [appointment.recurrence_group_id, pivotDate];
      }
    }

    const updateFields = [];
    const updateParams = [];

    if (parsedStartIso !== undefined) {
      updateFields.push('start_time = ?');
      updateParams.push(parsedStartIso);
    }
    if (parsedEndIso !== undefined) {
      updateFields.push('end_time = ?');
      updateParams.push(parsedEndIso);
    }
    if (location !== undefined) {
      updateFields.push('location = ?');
      updateParams.push(location === null || location === '' ? null : String(location));
    }
    if (parsedCapacity !== undefined) {
      updateFields.push('capacity = ?');
      updateParams.push(parsedCapacity);
    }
    if (visibility !== undefined) {
      updateFields.push('visibility = ?');
      updateParams.push(visibility === null || visibility === '' ? 'private' : String(visibility));
    }
    if (ap_title !== undefined) {
      updateFields.push('ap_title = ?');
      updateParams.push(ap_title === null || ap_title === '' ? null : String(ap_title));
    }
    if (ap_description !== undefined) {
      updateFields.push('ap_description = ?');
      updateParams.push(ap_description === null || ap_description === '' ? null : String(ap_description));
    }
    if (ap_color !== undefined) {
      updateFields.push('ap_color = ?');
      updateParams.push(ap_color === null || String(ap_color).trim() === '' ? '#1565A8' : String(ap_color).trim());
    }
    if (parsedCourseId !== undefined) {
      updateFields.push('course_id = ?');
      updateParams.push(parsedCourseId);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No valid fields provided for update' });
    }

    const targets = await dbAll(
      `SELECT appointment_id, status, start_time, end_time FROM appointments WHERE ${targetWhere}`,
      targetParams
    );
    if (!targets.length) {
      return res.status(404).json({ error: 'No appointments matched selected recurrence scope' });
    }

    await dbRun(`UPDATE appointments SET ${updateFields.join(', ')} WHERE ${targetWhere}`, [
      ...updateParams,
      ...targetParams,
    ]);

    for (const t of targets) {
      const newStart = parsedStartIso !== undefined ? parsedStartIso : t.start_time;
      const newEnd = parsedEndIso !== undefined ? parsedEndIso : t.end_time;
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
          t.appointment_id,
          changedBy,
          t.status,
          t.status,
          t.start_time,
          newStart,
          t.end_time,
          newEnd,
          note || `Appointment updated (${hasRecurringSeries ? scope : 'single'})`,
        ]
      );
    }

    const updatedRows = await dbAll(
      `SELECT * FROM appointments WHERE ${targetWhere} ORDER BY datetime(start_time) ASC`,
      targetParams
    );
    const updated = updatedRows[0] || null;
    routeLog('appointments', 'appointment_updated', {
      appointment_id: appointmentId,
      changed_by: changedBy,
      scope: hasRecurringSeries ? scope : 'single',
      updated_count: updatedRows.length,
    });

    notifyAttendeesOfOwnerChange({
      appointmentIds: updatedRows.map((row) => row.appointment_id),
      action: 'updated',
      note: note || null,
    }).catch((emailErr) => {
      console.error('[mailer] appointment update email failed:', emailErr);
    });

    return res.json({
      message: 'Appointment updated successfully',
      scope: hasRecurringSeries ? scope : 'single',
      updated_count: updatedRows.length,
      appointment: updated,
      appointments: updatedRows,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id/cancel', (req, res) => {
  const appointmentId = req.params.id;
  const { changed_by, note, recurrence_scope, pivot_instance_date } = req.body;

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

      const scope = normalizeRecurrenceScope(recurrence_scope);
      if (!scope) {
        return res.status(400).json({ error: 'recurrence_scope must be single, this_and_following, or all' });
      }

      const runSingleCancel = () => {
        const oldStatus = appointment.status;

        db.run(
          `
          UPDATE appointments
          SET status = 'cancelled'
          WHERE appointment_id = ?
          `,
          [appointmentId],
          function (err) {
            if (err) return res.status(500).json({ error: err.message });

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

                db.get(
                  `SELECT * FROM appointments WHERE appointment_id = ?`,
                  [appointmentId],
                  (err, updatedAppointment) => {
                    if (err) return res.status(500).json({ error: err.message });

                    routeLog('appointments', 'appointment_cancelled', {
                      appointment_id: appointmentId,
                      changed_by,
                      scope: 'single',
                    });

                    notifyAppointmentCancellation({
                      appointmentIds: [appointmentId],
                      changedByUserId: changed_by,
                      note: note || null,
                    }).catch((emailErr) => {
                      console.error('[mailer] appointment cancellation email failed:', emailErr);
                    });

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
      };

      const resolveRecurringSource = (callback) => {
        if (Number(appointment.recurrence_group_id) > 0) {
          return callback(null, {
            source_type: 'appointments',
            recurrence_group_id: appointment.recurrence_group_id,
            recurrence_instance_date: appointment.start_time,
          });
        }
        if (!appointment.created_from_availability) {
          return callback(null, null);
        }
        db.get(
          `SELECT recurrence_group_id, recurrence_instance_date FROM availabilities WHERE availability_id = ?`,
          [appointment.created_from_availability],
          callback
        );
      };

      resolveRecurringSource((srcErr, sourceAvailability) => {
        if (srcErr) return res.status(500).json({ error: srcErr.message });

        const recurrenceGroupId = sourceAvailability?.recurrence_group_id || null;
        if (!recurrenceGroupId || scope === 'single') {
          return runSingleCancel();
        }

        const pivotDate = pivot_instance_date || sourceAvailability?.recurrence_instance_date || appointment.start_time;
        let scopedWhere = sourceAvailability?.source_type === 'appointments'
          ? `a.recurrence_group_id = ?`
          : `a.created_from_availability IN (
              SELECT availability_id
              FROM availabilities
              WHERE recurrence_group_id = ?
            )`;
        const scopedParams = [recurrenceGroupId];
        if (scope === 'this_and_following') {
          scopedWhere = sourceAvailability?.source_type === 'appointments'
            ? `a.recurrence_group_id = ? AND datetime(a.start_time) >= datetime(?)`
            : `a.created_from_availability IN (
              SELECT availability_id
              FROM availabilities
              WHERE recurrence_group_id = ?
                AND recurrence_instance_date IS NOT NULL
                AND date(recurrence_instance_date) >= date(?)
            )`;
          scopedParams.push(pivotDate);
        }

        db.all(
          `SELECT a.appointment_id, a.status
             FROM appointments a
             WHERE ${scopedWhere}
               AND a.status != 'cancelled'`,
          scopedParams,
          (targetErr, targets) => {
            if (targetErr) return res.status(500).json({ error: targetErr.message });
            if (!targets.length) {
              return res.status(400).json({ error: 'No active appointments found in selected recurrence scope' });
            }

            const ids = targets.map((t) => t.appointment_id);
            const placeholders = ids.map(() => '?').join(',');

            db.run(
              `UPDATE appointments SET status = 'cancelled' WHERE appointment_id IN (${placeholders})`,
              ids,
              function (updateErr) {
                if (updateErr) return res.status(500).json({ error: updateErr.message });

                const insertOneHistory = (index) => {
                  if (index >= targets.length) {
                    routeLog('appointments', 'appointment_cancelled', {
                      appointment_ids: ids,
                      changed_by,
                      scope,
                      cancelled_count: ids.length,
                    });

                    notifyAppointmentCancellation({
                      appointmentIds: ids,
                      changedByUserId: changed_by,
                      note: note || null,
                    }).catch((emailErr) => {
                      console.error('[mailer] appointment cancellation email failed:', emailErr);
                    });

                    return res.json({
                      message: 'Recurring appointments cancelled successfully',
                      scope,
                      cancelled_count: ids.length,
                    });
                  }
                  const target = targets[index];
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
                      target.appointment_id,
                      changed_by,
                      target.status,
                      'cancelled',
                      note || `Appointment cancelled (${scope})`,
                    ],
                    (historyErr) => {
                      if (historyErr) return res.status(500).json({ error: historyErr.message });
                      insertOneHistory(index + 1);
                    }
                  );
                };

                insertOneHistory(0);
              }
            );
          }
        );
      }
      );
    }
  );
});

router.patch('/:id/dismiss-cancellation', async (req, res) => {
  const appointmentId = Number(req.params.id);
  const userId = Number(req.body?.user_id);

  if (!Number.isInteger(appointmentId) || appointmentId < 1) {
    return res.status(400).json({ error: 'Invalid appointment id' });
  }
  if (!Number.isInteger(userId) || userId < 1) {
    return res.status(400).json({ error: 'user_id is required' });
  }

  try {
    const appointment = await dbGet(
      `SELECT appointment_id, status FROM appointments WHERE appointment_id = ?`,
      [appointmentId]
    );
    if (!appointment) {
      return res.status(404).json({ error: 'Appointment not found' });
    }
    if (appointment.status !== 'cancelled') {
      return res.status(400).json({ error: 'Only cancelled appointments can be dismissed' });
    }

    const participant = await dbGet(
      `
      SELECT appointment_id
      FROM appointment_participants
      WHERE appointment_id = ?
        AND user_id = ?
      `,
      [appointmentId, userId]
    );
    if (!participant) {
      return res.status(403).json({ error: 'Only appointment participants can dismiss this cancellation' });
    }

    await dbRun(
      `
      INSERT OR IGNORE INTO appointment_cancellation_dismissals
        (appointment_id, user_id)
      VALUES (?, ?)
      `,
      [appointmentId, userId]
    );

    routeLog('appointments', 'appointment_cancellation_dismissed', {
      appointment_id: appointmentId,
      user_id: userId,
    });

    return res.json({ message: 'Cancelled appointment dismissed' });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;

// TODO: join users table, so dashboard shows names and email
