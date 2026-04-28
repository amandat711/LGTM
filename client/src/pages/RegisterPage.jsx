// JOCELYNE LI (69% estimated contribution) => Auth flow and UI polish/integration
import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import IconButton from '@mui/material/IconButton';
import Visibility from '@mui/icons-material/Visibility';
import VisibilityOff from '@mui/icons-material/VisibilityOff';
import AuthShell from '../components/AuthShell';
import { register } from '../api/auth';
import { isAllowedMcGillEmail } from '../auth/authUi';
import { MIN_PASSWORD_LEN } from '../constants/config';
import "../styles/RegisterPage.css";
import redpath from "../assets/redpath.jpg";


export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [department, setDepartment] = useState('');
  const [staffTitle, setStaffTitle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const isStaffEmail =
    normalizedEmail.endsWith('@mcgill.ca') &&
    !normalizedEmail.endsWith('@mail.mcgill.ca');

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (!isAllowedMcGillEmail(email)) {
      setError('Registration requires a @mail.mcgill.ca or @mcgill.ca email address.');
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
    if (isStaffEmail) {
      if (!department.trim()) {
        setError('Please enter your department.');
        return;
      }
      if (!staffTitle.trim()) {
        setError('Please enter your staff title.');
        return;
      }
    }

    setSubmitting(true);
    try {
      await register(name, email, password, department, staffTitle);
      navigate('/login');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <AuthShell>
      <div className="register-card">
        <div className="register-panel">
          <div className="register-panel-left">
            <img src={redpath} alt="Redpath Library" className="register-side-image" />
          </div>
          <div className="register-panel-right">
            <Link to="/" className="register-back-link">
              Back to website
              <span aria-hidden="true">→</span>
            </Link>
            <h1 className="register-title">Create an account</h1>
            <p className="register-subtitle">
              Already have an account?{' '}
              <Link to="/login" className="register-inline-link">
                Log In
              </Link>
            </p>

            {error ? (
              <p className="register-error" role="alert">
                {error}
              </p>
            ) : null}

            <form className="register-form" onSubmit={handleSubmit} noValidate>
              <div className="register-field-group">
                <div className="register-field">
                  <span className="register-field-icon" aria-hidden="true">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                      <circle cx="12" cy="8" r="3.5" stroke="currentColor" strokeWidth="1.8" />
                      <path
                        d="M5 19a7 7 0 0 1 14 0"
                        stroke="currentColor"
                        strokeWidth="1.8"
                        strokeLinecap="round"
                      />
                    </svg>
                  </span>
                  <input
                    id="register-name"
                    name="name"
                    type="text"
                    autoComplete="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Firstname Lastname"
                    className="register-input"
                  />
                </div>
              </div>

              <div className="register-field-group">
                <div className="register-field">
                  <span className="register-field-icon" aria-hidden="true">
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
                    id="register-email"
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="McGill email"
                    className="register-input"
                  />
                </div>
              </div>

              <div
                className={`register-staff-fields ${isStaffEmail ? 'register-staff-fields-open' : ''}`}
                aria-hidden={!isStaffEmail}
              >
                <div className="register-staff-fields-inner">
                  <div className="register-field-group">
                    <div className="register-field">
                      <input
                        id="register-department"
                        name="department"
                        type="text"
                        autoComplete="organization"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Department"
                        className="register-input register-input-no-icon"
                        disabled={!isStaffEmail}
                      />
                    </div>
                  </div>

                  <div className="register-field-group">
                    <div className="register-field">
                      <input
                        id="register-staff-title"
                        name="staffTitle"
                        type="text"
                        autoComplete="organization-title"
                        value={staffTitle}
                        onChange={(e) => setStaffTitle(e.target.value)}
                        placeholder="Staff Title"
                        className="register-input register-input-no-icon"
                        disabled={!isStaffEmail}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="register-field-group register-password-group">
                <div className="register-field">
                  <span className="register-field-icon" aria-hidden="true">
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
                    id="register-password"
                    name="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password"
                    className="register-input register-input-with-toggle"
                  />
                  <IconButton
                    type="button"
                    className="register-password-toggle"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                  </IconButton>
                </div>
                <p className="register-hint">
                  At least {MIN_PASSWORD_LEN} characters.
                </p>
              </div>

              <div className="register-field-group">
                <div className="register-field">
                  <span className="register-field-icon" aria-hidden="true">
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
                    id="register-confirm"
                    name="confirm"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    placeholder="Confirm password"
                    className="register-input register-input-with-toggle"
                  />
                  <IconButton
                    type="button"
                    className="register-password-toggle"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    edge="end"
                    size="small"
                  >
                    {showConfirmPassword ? <Visibility fontSize="small" /> : <VisibilityOff fontSize="small" />}
                  </IconButton>
                </div>
              </div>

              <button
                type="submit"
                className="register-submit"
                disabled={submitting}
              >
                {submitting ? '...' : 'Create an account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </AuthShell>
  );
}