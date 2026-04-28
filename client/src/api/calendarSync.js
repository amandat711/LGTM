// JOCELYNE LI (100% estimated contribution) => Feature implementation, integration work, and quality refinements
import { API_BASE } from '../constants/config';

const fetchOpts = { credentials: 'include' };

async function parseJson(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Calendar sync request failed');
  }
  return data;
}

export async function getCalendarSyncFeed() {
  const res = await fetch(`${API_BASE}/calendar-sync/me`, fetchOpts);
  return parseJson(res);
}

export async function rotateCalendarSyncFeed() {
  const res = await fetch(`${API_BASE}/calendar-sync/me/rotate`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  return parseJson(res);
}
