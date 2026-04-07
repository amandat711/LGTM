import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import {
  authCardClass,
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
  isAllowedMcGillEmail,
} from '../auth/authUi';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  function handleSubmit(e) {
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

    // Placeholder: replace with POST /api/auth/forgot-password when backend exists
    setSubmitted(true);
  }

  return (
    <AuthShell>
      <div className={authCardClass}>
        <h1 className="font-sans text-2xl font-semibold tracking-[-0.3px] text-[#0f0f0f]">
          Forgot password
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-[#555]">
          Enter the email you registered with. If an account exists, we will send reset instructions.
        </p>

        {submitted ? (
          <div
            className="mt-6 rounded-[5px] border border-[#e4e4e4] bg-[#f8f8f8] px-4 py-3 text-sm text-[#444]"
            role="status"
          >
            If <span className="font-medium text-[#0f0f0f]">{email.trim()}</span> is registered,
            check your inbox for next steps. You can close this page or return to log in.
          </div>
        ) : (
          <>
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
                <label htmlFor="forgot-email" className={authLabelClass}>
                  Email
                </label>
                <input
                  id="forgot-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="firstname.lastname@mail.mcgill.ca"
                  className={authInputClass}
                />
              </div>
              <button type="submit" className={authPrimaryBtnClass}>
                Send reset link
              </button>
            </form>
          </>
        )}

        <p className="mt-6 text-center text-[13px] text-[#555]">
          <Link to="/login" className="font-medium text-mcgill-red hover:text-mcgill-redDark">
            Back to log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
