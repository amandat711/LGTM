// SHIRLEY DING, Contribution: 100%
const db = require('../config/db');
const {
  sendAppointmentUpdatedByOwnerEmail,
  sendAppointmentCancelledByOwnerEmail,
  sendAppointmentCancelledByAttendeeToHostEmail,
  sendBookingRequestToHostEmail,
  sendHostBookingResponseToAttendeeEmail,
  sendStudentEventResponseToHostEmail,
  sendStudentJoinedCourseEventToHostEmail,
  sendAppointmentInvitationToInviteeEmail,
} = require('./mailer');

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
    db.run(sql, params, function onRun(err) {
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

async function notifyAttendeesOfOwnerChange({ appointmentIds, action, note }) {
  const normalizedIds = uniqueInts(
    (appointmentIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
  if (!normalizedIds.length) return;

  const placeholders = normalizedIds.map(() => '?').join(',');
  const rows = await dbAll(
    `
    SELECT
      a.appointment_id,
      a.ap_title,
      a.start_time,
      a.end_time,
      a.location,
      attendee.mcgill_email AS attendee_email,
      host.first_name AS host_first_name,
      host.last_name AS host_last_name
    FROM appointments a
    JOIN appointment_participants ap_attendee
      ON ap_attendee.appointment_id = a.appointment_id
    JOIN users attendee
      ON attendee.user_id = ap_attendee.user_id
    LEFT JOIN appointment_participants ap_host
      ON ap_host.appointment_id = a.appointment_id
      AND ap_host.participant_role = 'host'
    LEFT JOIN users host
      ON host.user_id = ap_host.user_id
    WHERE a.appointment_id IN (${placeholders})
      AND ap_attendee.participant_role = 'attendee'
      AND ap_attendee.response_status != 'declined'
    `,
    normalizedIds
  );

  if (!rows.length) return;

  await Promise.all(
    rows.map((row) => {
      const hostName = [row.host_first_name, row.host_last_name].filter(Boolean).join(' ').trim();
      const payload = {
        to: row.attendee_email,
        appointmentTitle: row.ap_title,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
        hostName,
        note,
      };

      if (action === 'cancelled') {
        return sendAppointmentCancelledByOwnerEmail(payload);
      }
      return sendAppointmentUpdatedByOwnerEmail(payload);
    })
  );
}

async function notifyHostOfStudentEventResponse({ appointmentIds, studentUserId, response }) {
  const ids = uniqueInts(
    (appointmentIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
  if (!ids.length || !Number.isInteger(Number(studentUserId)) || Number(studentUserId) < 1) return;
  if (response !== 'accepted' && response !== 'declined') return;

  const student = await dbGet(
    `SELECT first_name, last_name FROM users WHERE user_id = ?`,
    [Number(studentUserId)]
  );
  if (!student) return;
  const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || 'A student';

  const placeholders = ids.map(() => '?').join(',');
  const rows = await dbAll(
    `
    SELECT
      a.appointment_id,
      a.ap_title,
      a.start_time,
      h.mcgill_email AS host_email
    FROM appointments a
    JOIN appointment_participants aph
      ON aph.appointment_id = a.appointment_id
      AND aph.participant_role = 'host'
    JOIN users h
      ON h.user_id = aph.user_id
    WHERE a.appointment_id IN (${placeholders})
      AND h.mcgill_email IS NOT NULL
      AND TRIM(h.mcgill_email) != ''
    ORDER BY datetime(a.start_time) ASC
    `,
    ids
  );
  if (!rows.length) return;

  const byEmailKey = new Map();
  for (const row of rows) {
    const raw = String(row.host_email || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!byEmailKey.has(key)) byEmailKey.set(key, { to: raw, appts: [] });
    byEmailKey.get(key).appts.push(row);
  }

  await Promise.all(
    [...byEmailKey.values()].map(({ to, appts }) => {
      const first = appts[0];
      return sendStudentEventResponseToHostEmail({
        to,
        studentName,
        response,
        appointmentTitle: first.ap_title,
        startTime: first.start_time,
        sessionCount: appts.length,
      });
    })
  );
}

async function notifyHostOfStudentJoin({ appointmentIds, studentUserId }) {
  const ids = uniqueInts(
    (appointmentIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
  if (!ids.length || !Number.isInteger(Number(studentUserId)) || Number(studentUserId) < 1) return;

  const student = await dbGet(
    `SELECT first_name, last_name FROM users WHERE user_id = ?`,
    [Number(studentUserId)]
  );
  if (!student) return;
  const studentName = [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || 'A student';

  const placeholders = ids.map(() => '?').join(',');
  const rows = await dbAll(
    `
    SELECT
      a.appointment_id,
      a.ap_title,
      a.start_time,
      h.mcgill_email AS host_email
    FROM appointments a
    JOIN appointment_participants aph
      ON aph.appointment_id = a.appointment_id
      AND aph.participant_role = 'host'
    JOIN users h
      ON h.user_id = aph.user_id
    WHERE a.appointment_id IN (${placeholders})
      AND h.mcgill_email IS NOT NULL
      AND TRIM(h.mcgill_email) != ''
    ORDER BY datetime(a.start_time) ASC
    `,
    ids
  );
  if (!rows.length) return;

  const byEmailKey = new Map();
  for (const row of rows) {
    const raw = String(row.host_email || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!byEmailKey.has(key)) byEmailKey.set(key, { to: raw, appts: [] });
    byEmailKey.get(key).appts.push(row);
  }

  await Promise.all(
    [...byEmailKey.values()].map(({ to, appts }) => {
      const first = appts[0];
      return sendStudentJoinedCourseEventToHostEmail({
        to,
        studentName,
        appointmentTitle: first.ap_title,
        startTime: first.start_time,
        sessionCount: appts.length,
      });
    })
  );
}

async function partitionAppointmentIdsByCancelInitiator(appointmentIds, changedByUserId) {
  const ids = uniqueInts(
    (appointmentIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
  if (!ids.length) return { hostInitiated: [], attendeeInitiated: [] };

  const changedBy = Number(changedByUserId);
  if (!Number.isInteger(changedBy) || changedBy < 1) {
    return { hostInitiated: [], attendeeInitiated: [] };
  }

  const placeholders = ids.map(() => '?').join(',');
  const rows = await dbAll(
    `
    SELECT
      a.appointment_id,
      h.user_id AS host_id,
      (
        SELECT COUNT(*) FROM appointment_participants ap
        WHERE ap.appointment_id = a.appointment_id
          AND ap.participant_role = 'attendee'
          AND ap.user_id = ?
      ) AS attendee_match
    FROM appointments a
    JOIN appointment_participants h
      ON h.appointment_id = a.appointment_id
      AND h.participant_role = 'host'
    WHERE a.appointment_id IN (${placeholders})
    `,
    [changedBy, ...ids]
  );

  const hostInitiated = [];
  const attendeeInitiated = [];
  for (const row of rows) {
    const hostId = Number(row.host_id);
    if (hostId === changedBy) {
      hostInitiated.push(Number(row.appointment_id));
    } else if (Number(row.attendee_match) > 0) {
      attendeeInitiated.push(Number(row.appointment_id));
    }
  }
  return { hostInitiated, attendeeInitiated };
}

async function notifyHostsOfAttendeeCancellation({ appointmentIds, attendeeUserId, note }) {
  const ids = uniqueInts(
    (appointmentIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
  if (!ids.length || !Number.isInteger(Number(attendeeUserId)) || Number(attendeeUserId) < 1) return;

  const student = await dbGet(
    `SELECT first_name, last_name FROM users WHERE user_id = ?`,
    [Number(attendeeUserId)]
  );
  if (!student) return;
  const attendeeName =
    [student.first_name, student.last_name].filter(Boolean).join(' ').trim() || 'An attendee';

  const placeholders = ids.map(() => '?').join(',');
  const rows = await dbAll(
    `
    SELECT
      a.appointment_id,
      a.ap_title,
      a.start_time,
      a.end_time,
      a.location,
      h.mcgill_email AS host_email
    FROM appointments a
    JOIN appointment_participants aph
      ON aph.appointment_id = a.appointment_id
      AND aph.participant_role = 'host'
    JOIN users h
      ON h.user_id = aph.user_id
    WHERE a.appointment_id IN (${placeholders})
      AND h.mcgill_email IS NOT NULL
      AND TRIM(h.mcgill_email) != ''
    ORDER BY datetime(a.start_time) ASC
    `,
    ids
  );
  if (!rows.length) return;

  const byEmailKey = new Map();
  for (const row of rows) {
    const raw = String(row.host_email || '').trim();
    if (!raw) continue;
    const key = raw.toLowerCase();
    if (!byEmailKey.has(key)) byEmailKey.set(key, { to: raw, appts: [] });
    byEmailKey.get(key).appts.push(row);
  }

  await Promise.all(
    [...byEmailKey.values()].map(({ to, appts }) => {
      const first = appts[0];
      return sendAppointmentCancelledByAttendeeToHostEmail({
        to,
        attendeeName,
        appointmentTitle: first.ap_title,
        startTime: first.start_time,
        endTime: first.end_time,
        location: first.location,
        note: note || null,
        sessionCount: appts.length,
      });
    })
  );
}

async function notifyAppointmentCancellation({ appointmentIds, changedByUserId, note }) {
  const { hostInitiated, attendeeInitiated } = await partitionAppointmentIdsByCancelInitiator(
    appointmentIds,
    changedByUserId
  );
  if (hostInitiated.length) {
    await notifyAttendeesOfOwnerChange({
      appointmentIds: hostInitiated,
      action: 'cancelled',
      note,
    });
  }
  if (attendeeInitiated.length) {
    await notifyHostsOfAttendeeCancellation({
      appointmentIds: attendeeInitiated,
      attendeeUserId: changedByUserId,
      note,
    });
  }
}

async function cancelAppointmentsLinkedToAvailability({
  availabilityId,
  changedByUserId,
  notifyCancellationAsUserId,
  historyNote,
}) {
  const rows = await dbAll(
    `
    SELECT appointment_id, status
    FROM appointments
    WHERE created_from_availability = ?
      AND status != 'cancelled'
    `,
    [availabilityId]
  );
  if (!rows.length) return [];

  const emailInitiator =
    notifyCancellationAsUserId != null ? Number(notifyCancellationAsUserId) : Number(changedByUserId);

  const cancelledIds = [];
  for (const row of rows) {
    const id = Number(row.appointment_id);
    const oldStatus = row.status;
    await dbRun(`UPDATE appointments SET status = 'cancelled' WHERE appointment_id = ?`, [id]);
    await dbRun(
      `
      INSERT INTO appointment_history
      (appointment_id, changed_by, old_status, new_status, changed_at, note)
      VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP, ?)
      `,
      [id, changedByUserId, oldStatus, 'cancelled', historyNote || 'Appointment cancelled (availability removed)']
    );
    cancelledIds.push(id);
  }

  await notifyAppointmentCancellation({
    appointmentIds: cancelledIds,
    changedByUserId: emailInitiator,
    note: historyNote || null,
  });
  return cancelledIds;
}

async function notifyHostOfBookingRequestFromAvailability({ appointmentId, bookedByUserId }) {
  const aid = Number(appointmentId);
  const sid = Number(bookedByUserId);
  if (!Number.isInteger(aid) || aid < 1 || !Number.isInteger(sid) || sid < 1) return;

  const row = await dbGet(
    `
    SELECT
      a.ap_title,
      a.start_time,
      a.end_time,
      a.location,
      s.first_name AS student_first_name,
      s.last_name AS student_last_name,
      h.mcgill_email AS host_email,
      h.first_name AS host_first_name
    FROM appointments a
    JOIN appointment_participants apHost
      ON apHost.appointment_id = a.appointment_id AND apHost.participant_role = 'host'
    JOIN users h ON h.user_id = apHost.user_id
    JOIN appointment_participants apStu
      ON apStu.appointment_id = a.appointment_id
      AND apStu.participant_role = 'attendee'
      AND apStu.user_id = ?
    JOIN users s ON s.user_id = apStu.user_id
    WHERE a.appointment_id = ?
    `,
    [sid, aid]
  );
  if (!row?.host_email) return;

  const studentName =
    [row.student_first_name, row.student_last_name].filter(Boolean).join(' ').trim() || 'A student';

  await sendBookingRequestToHostEmail({
    to: String(row.host_email).trim(),
    hostFirstName: row.host_first_name ? String(row.host_first_name).trim() : '',
    studentName,
    appointmentTitle: row.ap_title,
    startTime: row.start_time,
    endTime: row.end_time,
    location: row.location,
  });
}

async function notifyAttendeesOfHostBookingDecision({ appointmentId, accepted }) {
  const rows = await dbAll(
    `
    SELECT
      u.mcgill_email AS attendee_email,
      a.ap_title,
      a.start_time,
      a.end_time,
      a.location,
      hf.first_name AS host_first_name,
      hf.last_name AS host_last_name
    FROM appointment_participants ap
    JOIN users u ON u.user_id = ap.user_id
    JOIN appointments a ON a.appointment_id = ap.appointment_id
    JOIN appointment_participants aph
      ON aph.appointment_id = a.appointment_id AND aph.participant_role = 'host'
    JOIN users hf ON hf.user_id = aph.user_id
    WHERE ap.appointment_id = ?
      AND ap.participant_role = 'attendee'
      AND u.mcgill_email IS NOT NULL
      AND TRIM(u.mcgill_email) != ''
    `,
    [appointmentId]
  );
  if (!rows.length) return;
  const hostName =
    [rows[0].host_first_name, rows[0].host_last_name].filter(Boolean).join(' ').trim() || 'The host';

  await Promise.all(
    rows.map((row) =>
      sendHostBookingResponseToAttendeeEmail({
        to: String(row.attendee_email).trim(),
        hostName,
        accepted,
        appointmentTitle: row.ap_title,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
      })
    )
  );
}

async function notifyInviteesOfDirectAppointments(appointmentIds, hostUserId) {
  const ids = uniqueInts(
    (appointmentIds || [])
      .map((id) => Number(id))
      .filter((id) => Number.isInteger(id) && id > 0)
  );
  if (!ids.length) return;

  const host = await dbGet(
    `SELECT first_name, last_name, mcgill_email FROM users WHERE user_id = ?`,
    [Number(hostUserId)]
  );
  const hostName =
    host && [host.first_name, host.last_name].filter(Boolean).join(' ').trim()
      ? [host.first_name, host.last_name].filter(Boolean).join(' ').trim()
      : 'The event organizer';

  const placeholders = ids.map(() => '?').join(',');
  const rows = await dbAll(
    `
    SELECT
      a.appointment_id,
      a.ap_title,
      a.start_time,
      a.end_time,
      a.location,
      u.mcgill_email AS invitee_email,
      u.first_name AS invitee_first_name
    FROM appointments a
    JOIN appointment_participants ap
      ON ap.appointment_id = a.appointment_id
      AND ap.participant_role = 'attendee'
      AND ap.response_status = 'pending'
    JOIN users u ON u.user_id = ap.user_id
    WHERE a.appointment_id IN (${placeholders})
      AND u.mcgill_email IS NOT NULL
      AND TRIM(u.mcgill_email) != ''
    ORDER BY datetime(a.start_time) ASC, u.user_id ASC
    `,
    ids
  );

  await Promise.all(
    rows.map((row) =>
      sendAppointmentInvitationToInviteeEmail({
        to: String(row.invitee_email).trim(),
        inviteeFirstName: row.invitee_first_name ? String(row.invitee_first_name).trim() : '',
        hostName,
        appointmentTitle: row.ap_title,
        startTime: row.start_time,
        endTime: row.end_time,
        location: row.location,
      })
    )
  );
}

module.exports = {
  notifyAttendeesOfOwnerChange,
  notifyHostOfStudentEventResponse,
  notifyHostOfStudentJoin,
  notifyAppointmentCancellation,
  cancelAppointmentsLinkedToAvailability,
  notifyHostOfBookingRequestFromAvailability,
  notifyAttendeesOfHostBookingDecision,
  notifyInviteesOfDirectAppointments,
};
