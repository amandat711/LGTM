import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
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
            <h1 className="login-title">Login</h1>

            {error ? (
              <p className="login-error" role="alert">
                {error}
              </p>
            ) : null}

            <form className="login-form" onSubmit={handleSubmit} noValidate>
              <div className="login-field" aria-label="Account field">
                <span className="login-field-icon" aria-hidden="true">
                  {/* icon */}
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
                    {/* icon */}
                  </span>
                  <input
                    id="login-password"
                    name="password"
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="login-input"
                  />
                </div>

                <div className="login-links-row">
                  <Link to="/forgot-password" className="login-forgot-link">
                    Forgot password?
                  </Link>
                </div>
              </div>

              <button type="submit" className="login-submit" disabled={submitting}>
                {submitting ? '...' : 'Log in'}
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
