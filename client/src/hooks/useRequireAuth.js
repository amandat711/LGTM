import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../api/auth';

/** Any logged-in user. Redirects to /login if unauthenticated. */
export default function useRequireAuth() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const { user: sessionUser } = await getSession();
        if (cancelled) return;
        if (!sessionUser) {
          navigate('/login', { replace: true });
          return;
        }
        setUser(sessionUser);
      } catch {
        if (!cancelled) navigate('/login', { replace: true });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [navigate]);

  return { user, userId: user?.user_id, loading };
}
