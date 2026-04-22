import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import { register } from '../api/auth';
import { isAllowedMcGillEmail } from '../auth/authUi';
import { MIN_PASSWORD_LEN } from '../constants/config';

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [department, setDepartment] = useState('');
  const [staffTitle, setStaffTitle] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const normalizedEmail = email.trim().toLowerCase();
  const isStaffEmail = normalizedEmail.endsWith('@mcgill.ca') && !normalizedEmail.endsWith('@mail.mcgill.ca');

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
      <div className="mx-auto w-full max-w-[520px] bg-white px-6 py-4 sm:px-2">
        <h1 className="text-center font-sans text-[40px] font-semibold tracking-[-0.5px] text-[#0f0f0f]">
          Create an account
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
              className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white pl-11 pr-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
            />
            </div>
          </div>
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
              id="register-email"
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
          <div
            className={`grid overflow-hidden transition-all duration-500 ease-in-out ${
              isStaffEmail
                ? 'max-h-52 translate-y-0 opacity-100'
                : 'max-h-0 -translate-y-1 opacity-0'
            }`}
            aria-hidden={!isStaffEmail}
          >
            <div className="mt-1 flex flex-col gap-4">
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    id="register-department"
                    name="department"
                    type="text"
                    autoComplete="organization"
                    value={department}
                    onChange={(e) => setDepartment(e.target.value)}
                    placeholder="Department"
                    className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white px-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
                    disabled={!isStaffEmail}
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2">
                <div className="relative">
                  <input
                    id="register-staff-title"
                    name="staffTitle"
                    type="text"
                    autoComplete="organization-title"
                    value={staffTitle}
                    onChange={(e) => setStaffTitle(e.target.value)}
                    placeholder="Staff Title"
                    className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white px-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
                    disabled={!isStaffEmail}
                  />
                </div>
              </div>
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
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white pl-11 pr-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
            />
            </div>
            <p className="text-[12px] text-[#777]">At least {MIN_PASSWORD_LEN} characters.</p>
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
              id="register-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="Confirm password"
              className="h-[44px] w-full rounded-full border border-[#cbcbcb] bg-white pl-11 pr-5 text-[15px] text-[#0f0f0f] outline-none transition-[border-color,box-shadow] placeholder:text-[#a1a1a1] focus:border-[#8f8f8f] focus:ring-2 focus:ring-[#dadada]"
            />
            </div>
          </div>
          <button
            type="submit"
            className="mx-auto mt-2 h-[40px] min-w-[112px] cursor-pointer rounded-full bg-black px-8 text-[16px] font-semibold text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
            disabled={submitting}
          >
            {submitting ? '...' : 'Register'}
          </button>
        </form>

        <p className="mt-8 text-center text-[13px] text-[#555]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-mcgill-red hover:text-mcgill-redDark">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
