//AMANDA TRAN used  - 100% contribution
// SHIRLEY DING, 3.1% contribution

// JOCELYNE LI (4% estimated contribution) => Backend integration, route wiring, and system stability improvements
const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { routeLog } = require('../utils/routeLog');
const { sendHeatmapAppointmentScheduledEmail } = require('../lib/mailer');

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ lastID: this.lastID, changes: this.changes });
    });
  });
}

function parseDate(value) {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function toSqliteDateTime(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${year}-${month}-${day}T${hours}:${minutes}:${seconds}`;
}

async function ensureSubmissionStatusColumn() {
  const columns = await dbAll(`PRAGMA table_info(hm_availability_submissions)`);
  const hasStatus = columns.some((col) => col.name === 'status');

  if (!hasStatus) {
    await dbRun(
      `ALTER TABLE hm_availability_submissions
       ADD COLUMN status TEXT NOT NULL DEFAULT 'pending'
       CHECK (status IN ('pending', 'approved', 'declined'))`
    );
  }
}

function mapHeatmapSummary(row) {
  return {
    id: row.hm_id,
    createdBy: row.created_by,
    title: row.hm_title,
    description: row.hm_description,
    link: row.hm_link,
    visibility: row.visibility,
    noEarlierTime: row.no_earlier_time,
    noLaterTime: row.no_later_time,
    timeZone: row.time_zone,
    createdAt: row.created_at,
    hostName: `${row.first_name} ${row.last_name}`,
    hostEmail: row.mcgill_email,
    submissionCount: Number(row.submission_count || 0),
    pendingCount: Number(row.pending_count || 0),
    mySubmission: row.my_submission_id
      ? {
          id: row.my_submission_id,
          status: row.my_submission_status,
          participantRole: row.my_submission_role,
          submittedAt: row.my_submission_submitted_at,
        }
      : null,
  };
}

async function listHeatmapSummaries({ createdBy = null, participantUserId = null, includePublic = false, limit = null } = {}) {
  const currentUserId = Number(participantUserId || createdBy || 0);
  const conditions = [];
  const params = [currentUserId];

  if (createdBy) {
    conditions.push(`h.created_by = ?`);
    params.push(Number(createdBy));
  }

  if (participantUserId) {
    conditions.push(
      includePublic
        ? `(h.visibility = 'public' OR my.submission_id IS NOT NULL)`
        : `my.submission_id IS NOT NULL`
    );
  } else if (includePublic && !createdBy) {
    conditions.push(`h.visibility = 'public'`);
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';
  const limitClause = limit ? `LIMIT ?` : '';
  if (limit) {
    params.push(Number(limit));
  }

  return dbAll(
    `
      SELECT
        h.hm_id,
        h.created_by,
        h.hm_title,
        h.hm_description,
        h.hm_link,
        h.visibility,
        h.no_earlier_time,
        h.no_later_time,
        h.time_zone,
        h.created_at,
        u.first_name,
        u.last_name,
        u.mcgill_email,
        COUNT(DISTINCT CASE WHEN s.participant_role != 'host' THEN s.submission_id END) AS submission_count,
        COUNT(DISTINCT CASE WHEN s.participant_role != 'host' AND s.status = 'pending' THEN s.submission_id END) AS pending_count,
        my.submission_id AS my_submission_id,
        my.status AS my_submission_status,
        my.participant_role AS my_submission_role,
        my.submitted_at AS my_submission_submitted_at
      FROM heatmaps h
      JOIN users u ON u.user_id = h.created_by
      LEFT JOIN hm_availability_submissions s ON s.heatmap_id = h.hm_id
      LEFT JOIN hm_availability_submissions my
        ON my.heatmap_id = h.hm_id
       AND my.user_id = ?
      ${whereClause}
      GROUP BY
        h.hm_id,
        h.created_by,
        h.hm_title,
        h.hm_description,
        h.hm_link,
        h.visibility,
        h.no_earlier_time,
        h.no_later_time,
        h.time_zone,
        h.created_at,
        u.first_name,
        u.last_name,
        u.mcgill_email,
        my.submission_id,
        my.status,
        my.participant_role,
        my.submitted_at
      ORDER BY datetime(h.created_at) DESC
      ${limitClause}
    `,
    params
  );
}

async function getHeatmapBundle(heatmapId) {
  const heatmap = await dbGet(
    `
      SELECT
        h.hm_id,
        h.created_by,
        h.hm_title,
        h.hm_description,
        h.hm_link,
        h.visibility,
        h.no_earlier_time,
        h.no_later_time,
        h.time_zone,
        h.created_at,
        u.first_name,
        u.last_name,
        u.mcgill_email
      FROM heatmaps h
      JOIN users u ON u.user_id = h.created_by
      WHERE h.hm_id = ?
    `,
    [heatmapId]
  );

  if (!heatmap) return null;

  const submissions = await dbAll(
    `
      SELECT
        s.submission_id,
        s.heatmap_id,
        s.user_id,
        s.participant_role,
        s.submitted_at,
        s.status,
        u.first_name,
        u.last_name,
        u.mcgill_email
      FROM hm_availability_submissions s
      JOIN users u ON u.user_id = s.user_id
      WHERE s.heatmap_id = ?
      ORDER BY datetime(s.submitted_at) DESC
    `,
    [heatmapId]
  );

  const submissionIds = submissions.map((row) => row.submission_id);
  const slots = submissionIds.length
    ? await dbAll(
        `
          SELECT
            slot_id,
            submission_id,
            start_time,
            end_time
          FROM hm_submitted_time_slots
          WHERE submission_id IN (${submissionIds.map(() => '?').join(',')})
          ORDER BY datetime(start_time) ASC
        `,
        submissionIds
      )
    : [];

  return {
    heatmap: {
      id: heatmap.hm_id,
      createdBy: heatmap.created_by,
      title: heatmap.hm_title,
      description: heatmap.hm_description,
      link: heatmap.hm_link,
      visibility: heatmap.visibility,
      noEarlierTime: heatmap.no_earlier_time,
      noLaterTime: heatmap.no_later_time,
      timeZone: heatmap.time_zone,
      createdAt: heatmap.created_at,
      hostName: `${heatmap.first_name} ${heatmap.last_name}`,
      hostEmail: heatmap.mcgill_email,
    },
    submissions: submissions.map((submission) => ({
      id: submission.submission_id,
      heatmapId: submission.heatmap_id,
      userId: submission.user_id,
      participantRole: submission.participant_role,
      submittedAt: submission.submitted_at,
      status: submission.status,
      userName: `${submission.first_name} ${submission.last_name}`,
      userEmail: submission.mcgill_email,
      slots: slots
        .filter((slot) => slot.submission_id === submission.submission_id)
        .map((slot) => ({
          id: slot.slot_id,
          startTime: slot.start_time,
          endTime: slot.end_time,
        })),
    })),
  };
}

async function getAppointmentWithParticipants(appointmentId) {
  const appointment = await dbGet(
    `SELECT * FROM appointments WHERE appointment_id = ?`,
    [appointmentId]
  );

  if (!appointment) return null;

  const participants = await dbAll(
    `
      SELECT
        ap.appointment_id,
        ap.user_id,
        ap.participant_role,
        ap.response_status,
        u.first_name,
        u.last_name,
        u.mcgill_email
      FROM appointment_participants ap
      JOIN users u ON u.user_id = ap.user_id
      WHERE ap.appointment_id = ?
      ORDER BY ap.participant_role DESC, ap.user_id ASC
    `,
    [appointmentId]
  );

  return {
    ...appointment,
    participants,
  };
}

async function deleteHeatmapForOwner(heatmapId, deletedBy) {
  if (!deletedBy) {
    const error = new Error('deleted_by is required');
    error.statusCode = 400;
    throw error;
  }

  const heatmap = await dbGet(`SELECT * FROM heatmaps WHERE hm_id = ?`, [heatmapId]);
  if (!heatmap) {
    const error = new Error('Heatmap not found');
    error.statusCode = 404;
    throw error;
  }

  if (Number(heatmap.created_by) !== Number(deletedBy)) {
    const error = new Error('Only the heatmap owner can delete this heatmap');
    error.statusCode = 403;
    throw error;
  }

  const submissions = await dbAll(
    `SELECT submission_id FROM hm_availability_submissions WHERE heatmap_id = ?`,
    [heatmapId]
  );
  const submissionIds = submissions.map((submission) => submission.submission_id);

  if (submissionIds.length > 0) {
    await dbRun(
      `DELETE FROM hm_submitted_time_slots WHERE submission_id IN (${submissionIds.map(() => '?').join(',')})`,
      submissionIds
    );
  }

  await dbRun(`DELETE FROM hm_availability_submissions WHERE heatmap_id = ?`, [heatmapId]);
  await dbRun(`DELETE FROM heatmaps WHERE hm_id = ?`, [heatmapId]);

  return {
    message: 'Heatmap deleted successfully',
    deletedHeatmapId: heatmapId,
  };
}

router.get('/', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();

    const { created_by, participant_user_id, include_public, limit } = req.query;
    const heatmaps = await listHeatmapSummaries({
      createdBy: created_by ? Number(created_by) : null,
      participantUserId: participant_user_id ? Number(participant_user_id) : null,
      includePublic: include_public === '1' || include_public === 'true',
      limit: limit ? Number(limit) : null,
    });

    return res.json(heatmaps.map(mapHeatmapSummary));
  } catch (err) {
    console.error('GET /heatmaps failed:', {
      query: req.query,
      message: err.message,
      stack: err.stack,
    });
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();
    const bundle = await getHeatmapBundle(Number(req.params.id));

    if (!bundle) {
      return res.status(404).json({ error: 'Heatmap not found' });
    }

    return res.json(bundle);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();

    const {
      created_by,
      hm_title,
      hm_description,
      visibility,
      no_earlier_time,
      no_later_time,
      time_zone,
    } = req.body;

    if (!created_by || !hm_title) {
      return res.status(400).json({ error: 'created_by and hm_title are required' });
    }

    const user = await dbGet(`SELECT user_id FROM users WHERE user_id = ?`, [created_by]);
    if (!user) {
      return res.status(404).json({ error: 'Creator user not found' });
    }

    const insertResult = await dbRun(
      `
        INSERT INTO heatmaps
          (created_by, hm_title, hm_description, hm_link, visibility, no_earlier_time, no_later_time, time_zone)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        created_by,
        hm_title,
        hm_description || null,
        `heatmap-${Date.now()}-${created_by}`,
        visibility || 'public',
        no_earlier_time || null,
        no_later_time || null,
        time_zone || 'America/Toronto',
      ]
    );

    const bundle = await getHeatmapBundle(insertResult.lastID);
    routeLog('heatmaps', 'heatmap_created', { heatmap_id: insertResult.lastID, created_by });
    return res.status(201).json(bundle);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();

    const heatmapId = Number(req.params.id);
    const {
      hm_title,
      hm_description,
      visibility,
      no_earlier_time,
      no_later_time,
      time_zone,
      changed_by,
    } = req.body;

    if (!changed_by) {
      return res.status(400).json({ error: 'changed_by is required' });
    }

    const heatmap = await dbGet(`SELECT * FROM heatmaps WHERE hm_id = ?`, [heatmapId]);
    if (!heatmap) {
      return res.status(404).json({ error: 'Heatmap not found' });
    }

    if (Number(heatmap.created_by) !== Number(changed_by)) {
      return res.status(403).json({ error: 'Only the heatmap owner can edit this heatmap' });
    }

    const nextTitle = typeof hm_title === 'string' ? hm_title.trim() : heatmap.hm_title;
    if (!nextTitle) {
      return res.status(400).json({ error: 'hm_title cannot be empty' });
    }

    const nextVisibility = visibility || heatmap.visibility;
    if (!['private', 'public'].includes(nextVisibility)) {
      return res.status(400).json({ error: 'visibility must be private or public' });
    }

    await dbRun(
      `
        UPDATE heatmaps
        SET
          hm_title = ?,
          hm_description = ?,
          visibility = ?,
          no_earlier_time = ?,
          no_later_time = ?,
          time_zone = ?
        WHERE hm_id = ?
      `,
      [
        nextTitle,
        hm_description !== undefined ? hm_description || null : heatmap.hm_description,
        nextVisibility,
        no_earlier_time !== undefined ? no_earlier_time || null : heatmap.no_earlier_time,
        no_later_time !== undefined ? no_later_time || null : heatmap.no_later_time,
        time_zone || heatmap.time_zone,
        heatmapId,
      ]
    );

    const bundle = await getHeatmapBundle(heatmapId);
    routeLog('heatmaps', 'heatmap_updated', { heatmap_id: heatmapId, changed_by });
    return res.json(bundle);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();

    const heatmapId = Number(req.params.id);
    const deleted_by = req.body.deleted_by || req.query.deleted_by;
    const result = await deleteHeatmapForOwner(heatmapId, deleted_by);

    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.post('/:id/delete', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();

    const heatmapId = Number(req.params.id);
    const deleted_by = req.body.deleted_by || req.query.deleted_by;
    const result = await deleteHeatmapForOwner(heatmapId, deleted_by);

    return res.json(result);
  } catch (err) {
    return res.status(err.statusCode || 500).json({ error: err.message });
  }
});

router.put('/:id/submissions', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();

    const heatmapId = Number(req.params.id);
    const { user_id, participant_role, slots = [], status } = req.body;

    if (!user_id || !participant_role) {
      return res.status(400).json({ error: 'user_id and participant_role are required' });
    }

    if (!['host', 'attendee', 'requester', 'invitee'].includes(participant_role)) {
      return res.status(400).json({ error: 'Invalid participant_role' });
    }

    const heatmap = await dbGet(`SELECT * FROM heatmaps WHERE hm_id = ?`, [heatmapId]);
    if (!heatmap) {
      return res.status(404).json({ error: 'Heatmap not found' });
    }

    const user = await dbGet(`SELECT user_id FROM users WHERE user_id = ?`, [user_id]);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const normalizedSlots = slots.map((slot) => {
      const start = parseDate(slot.start_time || slot.startTime);
      const end = parseDate(slot.end_time || slot.endTime);

      if (!start || !end || end <= start) {
        throw new Error('Each slot must include valid start and end times');
      }

      return {
        start_time: toSqliteDateTime(start),
        end_time: toSqliteDateTime(end),
      };
    });

    const finalStatus = status || (participant_role === 'host' ? 'approved' : 'pending');

    const existing = await dbGet(
      `SELECT submission_id FROM hm_availability_submissions WHERE heatmap_id = ? AND user_id = ?`,
      [heatmapId, user_id]
    );

    let submissionId = existing?.submission_id;

    if (!submissionId) {
      const insertResult = await dbRun(
        `
          INSERT INTO hm_availability_submissions
            (heatmap_id, user_id, participant_role, status)
          VALUES (?, ?, ?, ?)
        `,
        [heatmapId, user_id, participant_role, finalStatus]
      );
      submissionId = insertResult.lastID;
    } else {
      await dbRun(
        `
          UPDATE hm_availability_submissions
          SET participant_role = ?, status = ?, submitted_at = CURRENT_TIMESTAMP
          WHERE submission_id = ?
        `,
        [participant_role, finalStatus, submissionId]
      );
      await dbRun(`DELETE FROM hm_submitted_time_slots WHERE submission_id = ?`, [submissionId]);
    }

    for (const slot of normalizedSlots) {
      await dbRun(
        `
          INSERT INTO hm_submitted_time_slots (submission_id, start_time, end_time)
          VALUES (?, ?, ?)
        `,
        [submissionId, slot.start_time, slot.end_time]
      );
    }

    const bundle = await getHeatmapBundle(heatmapId);
    routeLog('heatmaps', 'heatmap_submissions_upserted', {
      heatmap_id: heatmapId,
      user_id,
      participant_role,
      slot_count: normalizedSlots.length,
    });
    return res.json(bundle);
  } catch (err) {
    const statusCode = err.message.includes('valid start and end times') ? 400 : 500;
    return res.status(statusCode).json({ error: err.message });
  }
});

router.patch('/submissions/:submissionId', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();

    const submissionId = Number(req.params.submissionId);
    const { status } = req.body;

    if (!['pending', 'approved', 'declined'].includes(status)) {
      return res.status(400).json({ error: 'status must be pending, approved, or declined' });
    }

    const submission = await dbGet(
      `SELECT submission_id, heatmap_id, participant_role FROM hm_availability_submissions WHERE submission_id = ?`,
      [submissionId]
    );

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (submission.participant_role === 'host') {
      return res.status(400).json({ error: 'Host submission status cannot be changed' });
    }

    await dbRun(
      `UPDATE hm_availability_submissions SET status = ?, submitted_at = CURRENT_TIMESTAMP WHERE submission_id = ?`,
      [status, submissionId]
    );

    const bundle = await getHeatmapBundle(submission.heatmap_id);
    routeLog('heatmaps', 'heatmap_submission_status_updated', {
      submission_id: submissionId,
      heatmap_id: submission.heatmap_id,
      status,
    });
    return res.json(bundle);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/appointments', async (req, res) => {
  try {
    await ensureSubmissionStatusColumn();

    const heatmapId = Number(req.params.id);
    const {
      host_user_id,
      attendee_user_ids = [],
      start_time,
      end_time,
      ap_title,
      ap_description,
      location,
      changed_by,
      approved_submission_ids = [],
    } = req.body;

    if (!host_user_id || !start_time || !end_time) {
      return res.status(400).json({ error: 'host_user_id, start_time, and end_time are required' });
    }

    const uniqueAttendeeIds = [...new Set(attendee_user_ids.map(Number).filter(Boolean))];
    if (uniqueAttendeeIds.length === 0) {
      return res.status(400).json({ error: 'At least one attendee_user_id is required' });
    }

    if (uniqueAttendeeIds.includes(Number(host_user_id))) {
      return res.status(400).json({ error: 'Host cannot also be an attendee' });
    }

    const heatmap = await dbGet(`SELECT * FROM heatmaps WHERE hm_id = ?`, [heatmapId]);
    if (!heatmap) {
      return res.status(404).json({ error: 'Heatmap not found' });
    }

    if (Number(heatmap.created_by) !== Number(host_user_id)) {
      return res.status(400).json({ error: 'host_user_id must match the heatmap owner' });
    }

    const startDate = parseDate(start_time);
    const endDate = parseDate(end_time);
    if (!startDate || !endDate || endDate <= startDate) {
      return res.status(400).json({ error: 'start_time and end_time must form a valid time range' });
    }

    const users = await dbAll(
      `SELECT user_id FROM users WHERE user_id IN (${[host_user_id, ...uniqueAttendeeIds].map(() => '?').join(',')})`,
      [host_user_id, ...uniqueAttendeeIds]
    );
    if (users.length !== uniqueAttendeeIds.length + 1) {
      return res.status(404).json({ error: 'One or more users were not found' });
    }

    const insertResult = await dbRun(
      `
        INSERT INTO appointments
          (course_id, created_from_availability, capacity, location, start_time, end_time, visibility, ap_title, ap_description, scheduling_mode, status)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        null,
        null,
        uniqueAttendeeIds.length,
        location || 'Heatmap booking',
        toSqliteDateTime(startDate),
        toSqliteDateTime(endDate),
        'private',
        ap_title || (uniqueAttendeeIds.length > 1 ? 'Group Heatmap Booking' : 'Heatmap Booking'),
        ap_description || null,
        'heatmap',
        'confirmed',
      ]
    );

    const appointmentId = insertResult.lastID;

    await dbRun(
      `
        INSERT INTO appointment_participants
          (appointment_id, user_id, participant_role, response_status)
        VALUES (?, ?, 'host', 'accepted')
      `,
      [appointmentId, host_user_id]
    );

    for (const attendeeId of uniqueAttendeeIds) {
      await dbRun(
        `
          INSERT INTO appointment_participants
            (appointment_id, user_id, participant_role, response_status)
          VALUES (?, ?, 'attendee', 'accepted')
        `,
        [appointmentId, attendeeId]
      );
    }

    await dbRun(
      `
        INSERT INTO appointment_history
          (appointment_id, changed_by, old_status, new_status, old_start_time, new_start_time, old_end_time, new_end_time, note)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        appointmentId,
        changed_by || host_user_id,
        null,
        'confirmed',
        null,
        toSqliteDateTime(startDate),
        null,
        toSqliteDateTime(endDate),
        'Appointment created from heatmap confirmation',
      ]
    );

    if (approved_submission_ids.length > 0) {
      await dbRun(
        `
          UPDATE hm_availability_submissions
          SET status = 'approved', submitted_at = CURRENT_TIMESTAMP
          WHERE submission_id IN (${approved_submission_ids.map(() => '?').join(',')})
        `,
        approved_submission_ids
      );
    }

    const appointment = await getAppointmentWithParticipants(appointmentId);
    const bundle = await getHeatmapBundle(heatmapId);

    routeLog('heatmaps', 'heatmap_appointment_created', {
      heatmap_id: heatmapId,
      appointment_id: appointmentId,
      host_user_id,
      attendee_count: uniqueAttendeeIds.length,
      changed_by: changed_by || host_user_id,
    });

    if (appointment?.participants?.length) {
      const hostPart = appointment.participants.find((p) => p.participant_role === 'host');
      const hostDisplay = hostPart
        ? [hostPart.first_name, hostPart.last_name].filter(Boolean).join(' ').trim() || 'The host'
        : 'The host';
      for (const p of appointment.participants) {
        const email = p.mcgill_email && String(p.mcgill_email).trim();
        if (!email) continue;
        const roleLabel = p.participant_role === 'host' ? 'host' : 'invitee';
        sendHeatmapAppointmentScheduledEmail({
          to: email,
          roleLabel,
          hostName: hostDisplay,
          appointmentTitle: appointment.ap_title,
          startTime: appointment.start_time,
          endTime: appointment.end_time,
          location: appointment.location,
        }).catch((emailErr) => {
          console.error('[mailer] heatmap appointment notify failed:', emailErr);
        });
      }
    }

    return res.status(201).json({
      message: 'Heatmap appointment created successfully',
      appointment,
      heatmap: bundle,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
