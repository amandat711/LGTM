// SHIRLEY DING, 42.2% contribution
import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { isAllowedMcGillEmail } from '../auth/authUi';
import { requestPasswordReset } from '../api/auth';
import '../styles/ForgotPasswordPage.css';
import redpath from '../assets/redpath.jpg';

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
      <div className="forgot-card">
        <div className="forgot-panel">
          <div className="forgot-panel-left">
            <img src={redpath} alt="Redpath Library" className="forgot-side-image" />
          </div>

          <div className="forgot-panel-right">
            <Link to="/" className="forgot-back-link">
              Back to website
              <span aria-hidden="true">→</span>
            </Link>

            <h1 className="forgot-title">Forgot password</h1>
            <p className="forgot-subtitle">
              Enter the email you registered with. If an account exists, we will send reset instructions.
            </p>

            {submitted ? (
              <p className="forgot-success" role="status">
                If <span className="forgot-success-email">{email.trim()}</span> is registered, check your inbox for
                next steps. You can close this page or return to log in.
              </p>
            ) : (
              <>
                {error ? (
                  <p className="forgot-error" role="alert">
                    {error}
                  </p>
                ) : null}

                <form className="forgot-form" onSubmit={handleSubmit} noValidate>
                  <div className="forgot-field-group">
                    <div className="forgot-field">
                      <span className="forgot-field-icon" aria-hidden="true">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
                        className="forgot-input"
                      />
                    </div>
                  </div>

                  <button type="submit" className="forgot-submit" disabled={submitting}>
                    {submitting ? 'Sending...' : 'Send reset link'}
                  </button>
                </form>
              </>
            )}

            <p className="forgot-footer-text">
              <Link to="/login" className="forgot-login-link">
                Back to log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
