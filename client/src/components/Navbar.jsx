/*AMANDA TRAN*/

import React from 'react';
import '../styles/Navbar.css';


 
export default function Navbar({ logo, title, onLeftClick, user, actions = [] }) {
  const badgeClass = user?.role === 'professor' ? 'role-tag-professor' : 'role-tag-student';

  const badgeLabel =
    user?.badgeText ??
    (user?.role === 'professor' ? 'Professor' : user?.role === 'student' ? 'Student' : null);

  return (
    <nav className="top-bar">

      {/* ── Left: logo + title  OR  plain back-button ──────── */}
      <div className="top-bar-left">
        <button
          onClick={onLeftClick}
          style={{
            background: 'none',
            border: 'none',
            padding: 0,
            cursor: onLeftClick ? 'pointer' : 'default',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          {logo && (
            <img
              src={logo}
              alt="logo"
              className="top-bar-logo"
              style={{ height: '100px', width: '100px', objectFit: 'contain' }}
            />
          )}
          {title && <span className="top-bar-title">{title}</span>}
        </button>
      </div>

      {/* ── Right: user info  +  action buttons ────────────── */}
      <div className="top-bar-right">
        {user && (
          <div className="top-bar-user">
            <div className="top-bar-user-info">
              {user.displayName && (
                <span className="top-bar-user-name">{user.displayName}</span>
              )}
              {badgeLabel && (
                <span className={`top-bar-user-role ${badgeClass}`}>{badgeLabel}</span>
              )}
            </div>
            {user.initials && (
              <div className="top-bar-user-avatar">{user.initials}</div>
            )}
          </div>
        )}

        {actions.map(({ label, onClick }, i) => (
          <button key={i} className="top-bar-button" onClick={onClick}>
            {label}
          </button>
        ))}
      </div>

    </nav>
  );
}
