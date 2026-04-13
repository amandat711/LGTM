import { useOutletContext } from 'react-router-dom';

/**
 * Get the session user and user id from the AppShellLayout (nested route).
 */
export default function useAppShellSession() {
  const ctx = useOutletContext();
  if (!ctx?.user || ctx.userId == null) {
    throw new Error(
      'useAppShellSession must be used under AppShellLayout (nested route).',
    );
  }
  return { user: ctx.user, userId: ctx.userId };
}
