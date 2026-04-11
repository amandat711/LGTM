import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { login } from '../api/auth';
import {
  authCardClass,
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
  isAllowedMcGillEmail,
} from '../auth/authUi';

function dashboardPath(userType, userId) {
  if (userType === 'student') {
    return `/dashboard/student/${userId}`;
  }
  return `/dashboard/professor/${userId}`;
}

export default function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!isAllowedMcGillEmail(email)) {
      setError('Log in with a @mail.mcgill.ca or @mcgill.ca email address.');
      return;
    }
    if (!password) {
      setError('Please enter your password.');
      return;
    }

    setSubmitting(true);
    try {
      const { user } = await login(email, password);
      navigate(dashboardPath(user.user_type, user.user_id));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className={authCardClass}>
        <h1 className="font-sans text-2xl font-semibold tracking-[-0.3px] text-[#0f0f0f]">
          Log in
        </h1>

        {error ? (
          <p
            className="mt-4 rounded-[5px] border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <form className="mt-8 flex flex-col gap-5" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="login-email" className={authLabelClass}>
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="firstname.lastname@mail.mcgill.ca"
              className={authInputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <label htmlFor="login-password" className={authLabelClass}>
                Password
              </label>
              <Link
                to="/forgot-password"
                className="text-[12px] font-medium text-mcgill-red hover:text-mcgill-redDark"
              >
                Forgot password?
              </Link>
            </div>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
            />
          </div>
          <button type="submit" className={authPrimaryBtnClass} disabled={submitting}>
            {submitting ? 'Signing in…' : 'Continue'}
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-[#555]">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-mcgill-red hover:text-mcgill-redDark">
            Register
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
