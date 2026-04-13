/**
 * Decide which page variant a user belongs to for split student vs faculty routes.
 */
export function userPageVariant(userType) {
  return userType === 'general_admin' ? 'professor' : 'student';
}

/**
 * Resolve the path for a given key and session user.
 */
export function resolvePath(key, sessionUser) {
  const uid = sessionUser.user_id;
  if (key === 'dashboard') {
    if (sessionUser.user_type === 'general_admin') {
      return `/dashboard/professor/${uid}`;
    }
    return `/dashboard/student/${uid}`;
  }
  throw new Error(`resolvePath: unknown key "${key}"`);
}

/** Check if a user is a faculty admin. */
export function isFacultyAdmin(userType) {
  return userPageVariant(userType) === 'professor';
}

/** Convert a session user to a navigation user. */
export function sessionUserToNavUser(sessionUser) {
  if (!sessionUser) return null;
  const faculty = isFacultyAdmin(sessionUser.user_type);
  return {
    name: `${sessionUser.first_name} ${sessionUser.last_name}`.trim(),
    email: sessionUser.mcgill_email,
    role: faculty ? 'professor' : 'student',
  };
}
