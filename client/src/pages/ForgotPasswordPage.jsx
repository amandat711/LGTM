import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { isAllowedMcGillEmail } from '../auth/authUi';
import { requestPasswordReset } from '../api/auth';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!email.trim()) {
      setError('Please enter your email address.');
      return;
    }
    if (!isAllowedMcGillEmail(email)) {
      setError('Use your @mail.mcgill.ca or @mcgill.ca address.');
      return;
    }

    setSubmitting(true);
    try {
      await requestPasswordReset(email);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send reset link.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="mx-auto w-full max-w-[520px] bg-white px-6 py-4 sm:px-2">
        <h1 className="text-center font-sans text-[40px] font-semibold tracking-[-0.5px] text-[#0f0f0f]">
          Forgot password
        </h1>
        <p className="mx-auto mt-2 max-w-[420px] text-center text-sm leading-relaxed text-[#555]">
          Enter the email you registered with. If an account exists, we will send reset instructions.
        </p>

        {submitted ? (
          <div
            className="mx-auto mt-6 max-w-[420px] rounded-[8px] border border-[#e4e4e4] bg-[#f8f8f8] px-4 py-3 text-sm text-[#444]"
            role="status"
          >
            If <span className="font-medium text-[#0f0f0f]">{email.trim()}</span> is registered,
            check your inbox for next steps. You can close this page or return to log in.
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
                  id="forgot-email"
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
              <button
                type="submit"
                className="mx-auto mt-2 h-[40px] min-w-[112px] rounded-full bg-black px-8 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
                disabled={submitting}
              >
                {submitting ? 'Sending...' : 'Send reset link'}
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
