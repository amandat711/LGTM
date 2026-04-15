import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '../api/auth';

/** Any logged-in user. Redirects to /login if unauthenticated, preserving the current URL. */
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
          const redirect = encodeURIComponent(window.location.pathname + window.location.search);
          navigate(`/login?redirect=${redirect}`, { replace: true });
          return;
        }
        setUser(sessionUser);
      } catch {
        if (!cancelled) {
          const redirect = encodeURIComponent(window.location.pathname + window.location.search);
          navigate(`/login?redirect=${redirect}`, { replace: true });
        }
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
