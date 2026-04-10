const API_BASE = 'http://localhost:5000';

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

export async function getMyAppointments(userId) {
  const res = await fetch(`${API_BASE}/appointments/my?user_id=${userId}`);
  return parseJson(res);
}

export async function getHostingAppointments(userId) {
  const res = await fetch(`${API_BASE}/appointments/hosting?user_id=${userId}`);
  return parseJson(res);
}

export async function cancelAppointment(appointmentId, changedBy) {
  const res = await fetch(`${API_BASE}/appointments/${appointmentId}/cancel`, {
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