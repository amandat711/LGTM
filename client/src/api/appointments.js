import { API_BASE } from '../constants/config';

const fetchOpts = { credentials: 'include' };

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

export async function cancelAppointment(appointmentId, changedBy) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      changed_by: Number(changedBy),
    }),
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

export async function acceptInvitation(invitationId, userId) {
  const res = await fetch(`${API_BASE}/appointments/invitations/${invitationId}/accept`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: Number(userId) }),
  });

  return parseJson(res);
}

export async function declineInvitation(invitationId, userId) {
  const res = await fetch(`${API_BASE}/appointments/invitations/${invitationId}/decline`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_id: Number(userId) }),
  });

  return parseJson(res);
}