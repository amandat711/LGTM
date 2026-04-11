const API_BASE = 'http://localhost:5000';

const jsonHeaders = { 'Content-Type': 'application/json' };

/** Same-origin policy: session cookie is set on the API origin; include credentials on every auth call. */
const fetchOpts = { credentials: 'include' };

export async function register(name, email, password) {
  const res = await fetch(`${API_BASE}/auth/register`, {
    ...fetchOpts,
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ name, email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || 'Registration failed.';
    throw new Error(msg);
  }
  return data;
}

export async function login(email, password) {
  const res = await fetch(`${API_BASE}/auth/login`, {
    ...fetchOpts,
    method: 'POST',
    headers: jsonHeaders,
    body: JSON.stringify({ email, password }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || 'Login failed.';
    throw new Error(msg);
  }
  return data;
}

export async function logout() {
  const res = await fetch(`${API_BASE}/auth/logout`, {
    ...fetchOpts,
    method: 'POST',
    headers: jsonHeaders,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.error || 'Logout failed.';
    throw new Error(msg);
  }
  return data;
}

export async function getSession() {
  const res = await fetch(`${API_BASE}/auth/me`, fetchOpts);
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    return { user: null };
  }
  if (!res.ok) {
    const msg = data.error || 'Could not load session.';
    throw new Error(msg);
  }
  return data;
}
