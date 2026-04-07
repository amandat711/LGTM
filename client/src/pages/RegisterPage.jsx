import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import AuthShell from '../components/AuthShell';
import {
  authCardClass,
  authInputClass,
  authLabelClass,
  authPrimaryBtnClass,
  isAllowedMcGillEmail,
} from '../auth/authUi';

const MIN_PASSWORD_LEN = 8;

export default function RegisterPage() {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  function handleSubmit(e) {
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

    // Placeholder: replace with POST /api/auth/register
    navigate('/student');
  }

  return (
    <AuthShell>
      <div className={authCardClass}>
        <h1 className="font-sans text-2xl font-semibold tracking-[-0.3px] text-[#0f0f0f]">
          Create an account
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
            <label htmlFor="register-name" className={authLabelClass}>
              Full name
            </label>
            <input
              id="register-name"
              name="name"
              type="text"
              autoComplete="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Firstname Lastname"
              className={authInputClass}
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-email" className={authLabelClass}>
              Email
            </label>
            <input
              id="register-email"
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
            <label htmlFor="register-password" className={authLabelClass}>
              Password
            </label>
            <input
              id="register-password"
              name="password"
              type="password"
              autoComplete="new-password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={authInputClass}
            />
            <p className="text-[12px] text-[#777]">At least {MIN_PASSWORD_LEN} characters.</p>
          </div>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="register-confirm" className={authLabelClass}>
              Confirm password
            </label>
            <input
              id="register-confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className={authInputClass}
            />
          </div>
          <button type="submit" className={authPrimaryBtnClass}>
            Register
          </button>
        </form>

        <p className="mt-6 text-center text-[13px] text-[#555]">
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-mcgill-red hover:text-mcgill-redDark">
            Log in
          </Link>
        </p>
      </div>
    </AuthShell>
  );
}
