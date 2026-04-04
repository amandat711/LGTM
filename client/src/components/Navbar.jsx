import React from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Navbar
 * Props:
 *   user – { name: string, email: string, role: 'professor' | 'student' }
 */
export default function Navbar({ user }) {
  const navigate  = useNavigate();
  const initials  = user?.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'U';
  const isProfessor = user?.role === 'professor';

  return (
    <nav className="navbar">
      {/* Brand */}
      <button className="navbar-brand" onClick={() => navigate('/home')} style={{ cursor: 'pointer', background: 'none', border: 'none', padding: 0 }}>
        <div className="navbar-favicon">M</div>
        <span className="navbar-name">LGTM<span>.</span></span>
      </button>

      {/* Right side */}
      <div className="navbar-right">
        {user && (
          <div className="navbar-user">
            <span
              className={`navbar-role-badge ${isProfessor ? 'role-professor' : 'role-student'}`}
            >
              {isProfessor ? 'Professor' : 'Student'}
            </span>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>{user.name}</span>
            <div className="navbar-avatar">{initials}</div>
          </div>
        )}
      </div>
    </nav>
  );
}
