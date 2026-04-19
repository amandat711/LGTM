import { API_BASE } from '../constants/config';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export async function getUsers(typeOrOptions = '') {
  const opts =
    typeof typeOrOptions === 'string'
      ? { type: typeOrOptions || undefined }
      : typeOrOptions || {};
  const params = new URLSearchParams();
  if (opts.type) params.set('type', opts.type);
  if (opts.q) params.set('q', opts.q);
  const qs = params.toString();
  const res = await fetch(`${API_BASE}/users${qs ? `?${qs}` : ''}`, {
    credentials: 'include',
  });
  return handleResponse(res);
}

export async function getUser(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}`, { credentials: 'include' });
  return handleResponse(res);
}
