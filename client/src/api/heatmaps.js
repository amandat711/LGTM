import { API_BASE } from '../constants/config';

async function handleResponse(res) {
  const text = await res.text();
  let data = {};

  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = {};
  }

  if (!res.ok) {
    throw new Error(data.error || data.message || text || 'Something went wrong');
  }

  return data;
}

export async function getHeatmap(heatmapId) {
  const res = await fetch(`${API_BASE}/heatmaps/${heatmapId}`);
  return handleResponse(res);
}

export async function getHeatmaps(params = {}) {
  const search = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      search.set(key, String(value));
    }
  });

  const query = search.toString();
  const res = await fetch(`${API_BASE}/heatmaps${query ? `?${query}` : ''}`);
  return handleResponse(res);
}

export async function registerHeatmapInvitation(heatmapId, userId) {
  const res = await fetch(`${API_BASE}/heatmaps/${heatmapId}/invitations`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: Number(userId) }),
  });

  return handleResponse(res);
}

export async function createHeatmap(payload) {
  const res = await fetch(`${API_BASE}/heatmaps`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

export async function updateHeatmap(heatmapId, payload) {
  const res = await fetch(`${API_BASE}/heatmaps/${heatmapId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

export async function deleteHeatmap(heatmapId, deletedBy) {
  const search = new URLSearchParams({ deleted_by: String(deletedBy) });
  const res = await fetch(`${API_BASE}/heatmaps/${heatmapId}/delete?${search.toString()}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ deleted_by: deletedBy }),
  });

  return handleResponse(res);
}

export async function saveHeatmapSubmission(heatmapId, payload) {
  const res = await fetch(`${API_BASE}/heatmaps/${heatmapId}/submissions`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}

export async function updateHeatmapSubmissionStatus(submissionId, status) {
  const res = await fetch(`${API_BASE}/heatmaps/submissions/${submissionId}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ status }),
  });

  return handleResponse(res);
}

export async function createHeatmapAppointment(heatmapId, payload) {
  const res = await fetch(`${API_BASE}/heatmaps/${heatmapId}/appointments`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  return handleResponse(res);
}
