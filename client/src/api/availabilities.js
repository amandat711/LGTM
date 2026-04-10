const API_BASE = 'http://localhost:5000';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export async function createAvailability(payload) {
  const res = await fetch(`${API_BASE}/availabilities`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

export async function deleteAvailability(availabilityId, deletedBy) {
  const res = await fetch(`${API_BASE}/availabilities/${availabilityId}`, {
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleted_by: deletedBy }),
  });

  return handleResponse(res);
}

export async function getProfessorAvailabilities(createdBy) {
  const res = await fetch(`${API_BASE}/availabilities/owner/${createdBy}`);
  return handleResponse(res);
}