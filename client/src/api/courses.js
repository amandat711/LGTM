// AMANDA TRAN
const API_BASE = 'http://localhost:4000';

const fetchOpts = { credentials: 'include' };

async function handleResponse(res) {
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function getCourses(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.set(key, String(value));
    }
  });

  const qs = query.toString();
  const res = await fetch(`${API_BASE}/courses${qs ? `?${qs}` : ''}`, fetchOpts);
  return handleResponse(res);
}

export async function getCourse(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}`, fetchOpts);
  return handleResponse(res);
}

export async function createCourse(payload) {
  const res = await fetch(`${API_BASE}/courses`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}

/** Student invite flow. 409 with `course` still resolves (already enrolled). */
export async function joinCourse(token) {
  const trimmed = String(token || '').trim();
  const res = await fetch(`${API_BASE}/courses/join`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: trimmed }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 409 && data.course?.course_id != null) {
    return { ...data, alreadyEnrolled: true };
  }
  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }
  return data;
}

export async function assignCourseAdmin(courseId, userId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/admins`, {
    ...fetchOpts,
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ user_id: userId }),
  });
  return handleResponse(res);
}

export async function revokeCourseAdmin(courseId, userId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/admins/${userId}`, {
    ...fetchOpts,
    method: 'DELETE',
  });
  return handleResponse(res);
}

export async function regenerateCourseInvite(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}/invite/regenerate`, {
    ...fetchOpts,
    method: 'POST',
  });
  return handleResponse(res);
}

export async function deleteCourse(courseId) {
  const res = await fetch(`${API_BASE}/courses/${courseId}`, {
    ...fetchOpts,
    method: 'DELETE',
  });
  return handleResponse(res);
}

export async function updateCourse(courseId, payload) {
  const res = await fetch(`${API_BASE}/courses/${courseId}`, {
    ...fetchOpts,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return handleResponse(res);
}
