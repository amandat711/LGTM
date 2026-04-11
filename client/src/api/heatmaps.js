const API_BASE = 'http://localhost:5000';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export async function getHeatmap(heatmapId) {
  const res = await fetch(`${API_BASE}/heatmaps/${heatmapId}`);
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
