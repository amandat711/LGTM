import { API_BASE } from '../constants/config';

const fetchOpts = { credentials: 'include' };

// #region agent log
fetch('http://127.0.0.1:7735/ingest/cc35f6a7-c18d-4c61-b5e2-47ecdd6bdfac',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'35f1ac'},body:JSON.stringify({sessionId:'35f1ac',runId:'run1',hypothesisId:'H1',location:'client/src/api/appointments.js:5',message:'appointments module evaluated with export contract',data:{exports:['getMyAppointments','getHostingAppointments','cancelAppointment','updateAppointment','createAppointment','createDirectAppointment','getMyInvitations','acceptInvitation','declineInvitation','updateMyParticipantStatus']},timestamp:Date.now()})}).catch(()=>{});
// #endregion

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export async function getMyAppointments(userId) {
  const res = await fetch(`${API_BASE}/appointments/my?user_id=${userId}`, fetchOpts);
  return parseJson(res);
}

export async function getHostingAppointments(userId) {
  const res = await fetch(`${API_BASE}/appointments/hosting?user_id=${userId}`, fetchOpts);
  return parseJson(res);
}

export async function cancelAppointment(appointmentId, changedBy, options = {}) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      changed_by: Number(changedBy),
      recurrence_scope: options.recurrence_scope,
      pivot_instance_date: options.pivot_instance_date,
    }),
  });

  return parseJson(res);
}

export async function updateAppointment(appointmentId, payload) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseJson(res);
}

export async function createAppointment(availabilityId, bookedBy) {
  const res = await fetch(`${API_BASE}/appointments`, {
    ...fetchOpts,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      availability_id: Number(availabilityId),
      booked_by: Number(bookedBy),
    }),
  });

  return parseJson(res);
}

export async function joinCourseEvent(appointmentId, userId) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/join`, {
    ...fetchOpts,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: Number(userId),
    }),
  });

  return parseJson(res);
}

export async function createDirectAppointment(payload) {
  const res = await fetch(`${API_BASE}/appointments/direct`, {
    ...fetchOpts,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  return parseJson(res);
}

export async function getMyInvitations(userId) {
  const res = await fetch(`${API_BASE}/appointments/invitations/my?user_id=${userId}`, fetchOpts);
  return parseJson(res);
}

export async function acceptInvitation(invitationId, userId, options = {}) {
  const res = await fetch(`${API_BASE}/appointments/invitations/${invitationId}/accept`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: Number(userId),
      recurrence_scope: options.recurrence_scope,
      pivot_instance_date: options.pivot_instance_date,
    }),
  });

  return parseJson(res);
}

export async function declineInvitation(invitationId, userId, options = {}) {
  const res = await fetch(`${API_BASE}/appointments/invitations/${invitationId}/decline`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: Number(userId),
      recurrence_scope: options.recurrence_scope,
      pivot_instance_date: options.pivot_instance_date,
    }),
  });

  return parseJson(res);
}

export async function updateMyParticipantStatus(appointmentId, userId, status) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/participants/${userId}/status`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      user_id: Number(userId),
      status,
    }),
  });

  return parseJson(res);
}