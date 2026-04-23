import { API_BASE } from '../constants/config';

const fetchOpts = { credentials: 'include' };

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export async function createAvailability(payload) {
  const res = await fetch(`${API_BASE}/availabilities`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

export async function deleteAvailability(availabilityId, deletedBy, options = {}) {
  const res = await fetch(`${API_BASE}/availabilities/${availabilityId}`, {
    ...fetchOpts,
    method: 'DELETE',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      deleted_by: deletedBy,
      recurrence_scope: options.recurrence_scope,
      pivot_instance_date: options.pivot_instance_date,
    }),
  });

  return handleResponse(res);
}

export async function updateAvailability(availabilityId, payload) {
  const res = await fetch(`${API_BASE}/availabilities/${availabilityId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

export async function getProfessorAvailabilities(createdBy) {
  const res = await fetch(`${API_BASE}/availabilities/owner/${createdBy}`);
  return handleResponse(res);
}

export async function getAvailableProfessors(search = '') {
  const query = search ? `?search=${encodeURIComponent(search)}` : '';
  const res = await fetch(`${API_BASE}/availabilities/owners${query}`);
  return handleResponse(res);
}

export async function getProfessorPublicAvailabilities(createdBy) {
  const res = await fetch(`${API_BASE}/availabilities?created_by=${encodeURIComponent(createdBy)}&visibility=public&include_full=false&include_past=false`);
  return handleResponse(res);
}
