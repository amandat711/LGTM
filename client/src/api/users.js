import { API_BASE } from '../constants/config';

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || 'Something went wrong');
  }

  return data;
}

export async function getUsers(type = '') {
  const query = type ? `?type=${encodeURIComponent(type)}` : '';
  const res = await fetch(`${API_BASE}/users${query}`);
  return handleResponse(res);
}

export async function getUser(userId) {
  const res = await fetch(`${API_BASE}/users/${userId}`);
  return handleResponse(res);
}
