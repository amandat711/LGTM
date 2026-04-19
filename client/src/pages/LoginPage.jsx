import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { login } from '../api/auth';
import { resolvePath } from '../auth/authUtils';
import { isAllowedMcGillEmail } from '../auth/authUi';

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect');
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
      navigate(redirectTo ? decodeURIComponent(redirectTo) : resolvePath('dashboard', user));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[520px] bg-white px-6 py-4 sm:px-2">
        <h1 className="text-center font-sans text-[40px] font-semibold tracking-[-0.5px] text-[#0f0f0f]">
          Login
        </h1>

        {error ? (
          <p
            className="mx-auto mt-5 max-w-[420px] rounded-[8px] border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <form className="mx-auto mt-6 flex w-full max-w-[420px] flex-col gap-4" onSubmit={handleSubmit} noValidate>
          <div className="flex flex-col gap-2">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a1a1]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <path
                    d="M4 7h16v10H4V7Zm0 0 8 6 8-6"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </span>
            <input
              id="login-email"
              name="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="McGill email"
              className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white pl-11 pr-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
            />
            </div>
          </div>
          <div className="flex flex-col gap-1">
            <div className="relative">
              <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#a1a1a1]">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
                  <rect
                    x="5"
                    y="10"
                    width="14"
                    height="10"
                    rx="2"
                    stroke="currentColor"
                    strokeWidth="1.8"
                  />
                  <path
                    d="M8 10V7a4 4 0 1 1 8 0v3"
                    stroke="currentColor"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                  />
                </svg>
              </span>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white pl-11 pr-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
            />
            </div>
            <div className="flex justify-end pr-2">
              <Link to="/forgot-password" className="text-[11px] text-[#444] hover:text-black">
                Forgot password?
              </Link>
            </div>
          </div>

          <button
            type="submit"
            className="mx-auto mt-2 h-[40px] min-w-[112px] cursor-pointer rounded-full bg-black px-8 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? '...' : 'Log in'}
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-[#555]">
          No account yet?{' '}
          <Link to="/register" className="font-medium text-mcgill-red hover:text-mcgill-redDark">
            Register
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
