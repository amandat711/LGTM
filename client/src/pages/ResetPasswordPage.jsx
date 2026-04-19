import { useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { resetPassword } from '../api/auth';
import { MIN_PASSWORD_LEN } from '../constants/config';

export default function ResetPasswordPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const token = useMemo(() => new URLSearchParams(location.search).get('token') || '', [location]);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!token) {
      setError('Reset link is missing or invalid.');
      return;
    }
    if (password.length < MIN_PASSWORD_LEN) {
      setError(`Password must be at least ${MIN_PASSWORD_LEN} characters.`);
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      await resetPassword(token, password);
      setDone(true);
      setTimeout(() => navigate('/login'), 1200);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not reset password.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[520px] bg-white px-6 py-4 sm:px-2">
        <h1 className="text-center font-sans text-[40px] font-semibold tracking-[-0.5px] text-[#0f0f0f]">
          Reset password
        </h1>

        {done ? (
          <div className="mx-auto mt-6 max-w-[420px] rounded-[8px] border border-[#e4e4e4] bg-[#f8f8f8] px-4 py-3 text-sm text-[#444]">
            Password updated successfully. Redirecting to log in...
          </div>
        ) : (
          <>
            {error ? (
              <p
                className="mx-auto mt-5 max-w-[420px] rounded-[8px] border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-800"
                role="alert"
              >
                {error}
              </p>
            ) : null}

            <form
              className="mx-auto mt-6 flex w-full max-w-[420px] flex-col gap-4"
              onSubmit={handleSubmit}
              noValidate
            >
              <div className="flex flex-col gap-2">
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
                    id="reset-password"
                    name="password"
                    type="password"
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="New password"
                    className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white pl-11 pr-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-2">
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
                    id="reset-confirm"
                    name="confirm"
                    type="password"
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm new password"
                    className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white pl-11 pr-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="mx-auto mt-2 h-[40px] min-w-[112px] rounded-full bg-black px-8 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? 'Saving...' : 'Save password'}
              </button>
            </form>
          </>
        )}

        <p className="mt-8 text-center text-[13px] text-[#555]">
          <Link to="/login" className="font-medium text-mcgill-red hover:text-mcgill-redDark">
            Back to log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
