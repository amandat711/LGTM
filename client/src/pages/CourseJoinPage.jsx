import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import useRequireAuth from '../hooks/useRequireAuth';
import { joinCourse } from '../api/courses';

export default function CourseJoinPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') || '';
  const { user, loading: authLoading } = useRequireAuth();
  const joinStarted = useRef(false);

  useEffect(() => {
    if (authLoading) return;

    if (!token.trim()) {
      navigate('/courses', { replace: true });
      return;
    }

    if (user.user_type !== 'student') {
      return;
    }

    if (joinStarted.current) return;
    joinStarted.current = true;

    joinCourse(token)
      .then((data) => {
        const id = data.course?.course_id;
        if (id != null) {
          navigate(`/courses/${id}`, { replace: true });
        } else {
          navigate('/courses', { replace: true });
        }
      })
      .catch(() => {
        navigate('/courses', { replace: true });
      });
  }, [authLoading, user, token, navigate]);

  if (authLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
        <p>Loading…</p>
      </div>
    );
  }

  if (!token.trim()) {
    return null;
  }

  if (user.user_type !== 'student') {
    return (
      <div
        style={{
          padding: 48,
          maxWidth: 520,
          margin: '0 auto',
          fontFamily: 'Segoe UI, sans-serif',
        }}
      >
        <h1 style={{ fontSize: 20, marginBottom: 12 }}>Invite link</h1>
        <p style={{ color: '#444', lineHeight: 1.5 }}>
          Only student accounts can join a course with an invite link.
        </p>
        <button
          type="button"
          onClick={() => navigate('/courses')}
          style={{
            marginTop: 16,
            padding: '10px 18px',
            borderRadius: 8,
            border: '1px solid #ccc',
            background: '#f5f5f5',
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          Back to courses
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: 48, textAlign: 'center', fontFamily: 'Segoe UI, sans-serif' }}>
      <p>Joining course…</p>
    </div>
  );
}
