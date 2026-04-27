// SHIRLEY DING
import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AuthShell from '../components/AuthShell';
import { login } from '../api/auth';
import { resolvePath } from '../auth/authUtils';
import { isAllowedMcGillEmail } from '../auth/authUi';
import "../styles/LoginPage.css";
import redpath from "../assets/redpath.jpg";

export default function LoginPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const redirectTo = new URLSearchParams(location.search).get('redirect');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      <div className="login-card">
        <div className="login-panel">
          <div className="login-panel-left">
            <img src={redpath} alt="Redpath Library" className="login-side-image" />
          </div>

          <div className="login-panel-right">
            <Link to="/" className="login-back-link">
              Back to website
              <span aria-hidden="true">→</span>
            </Link>
            <h1 className="login-title">Log In</h1>
            <p className="login-subtitle">
              Don&apos;t have an account?{' '}
              <Link to="/register" className="login-inline-link">
                Sign Up
              </Link>
            </p>

            {error ? (
              <p className="login-error" role="alert">
                {error}
              </p>
            ) : null}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field" aria-label="Account field">
                <span className="login-field-icon" aria-hidden="true">
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
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="McGill email"
                  className="login-input"
                />
              </div>

              <div className="login-field-group">
                <div className="login-field" aria-label="Password field">
                  <span className="login-field-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
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
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="login-input"
                  />
                  <IconButton
                    type="button"
                    className="login-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                  </IconButton>
                </div>

                <div className="login-links-row">
                  <Link to="/forgot-password" className="login-forgot-link">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={submitting}>
                {submitting ? '...' : 'Log In'}
              </button>
            </form>

            <p className="login-footer-text">
              No account yet?{' '}
              <Link to="/register" className="login-register-link">
                Register
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}
