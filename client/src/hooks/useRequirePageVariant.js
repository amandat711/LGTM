// SHIRLEY DING
import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getSession } from '../api/auth';
import { userPageVariant } from '../auth/authUtils';

/**
 * Check if the user is a student or professor and redirect to the correct page.
 */
export default function useRequirePageVariant({
  variant,
  canonicalPath,
  routeParam = 'userId',
  enforceRouteUserId = true,
}) {
  const navigate = useNavigate();
  const params = useParams();
  const canonicalPathRef = useRef(canonicalPath);
  canonicalPathRef.current = canonicalPath;
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const routeParamValue = params[routeParam];

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

        const wantProfessor = variant === 'professor';
        const userIsProfessor = userPageVariant(sessionUser.user_type) === 'professor';

        if (wantProfessor !== userIsProfessor) {
          navigate(canonicalPathRef.current(sessionUser), { replace: true });
          return;
        }

        if (enforceRouteUserId) {
          const id = Number(sessionUser.user_id);
          const paramId =
            routeParamValue != null && routeParamValue !== ''
              ? Number(routeParamValue)
              : NaN;
          if (!Number.isNaN(paramId) && paramId !== id) {
            navigate(canonicalPathRef.current(sessionUser), { replace: true });
            return;
          }
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
  }, [
    navigate,
    variant,
    routeParam,
    enforceRouteUserId,
    routeParamValue,
  ]);

  return { user, userId: user?.user_id, loading };
}
