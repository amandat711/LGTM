/*AMANDA TRAN*/
/* Rita Zhang */

import React from 'react';
import '../styles/Navbar.css';
import NotificationPanel from './dashboard/NotificationPanel';

export default function Navbar({
  logo,
  title,
  onLeftClick,
  user,
  actions = [],
  appointments = [],
}) {
  const badgeClass = user?.role === 'professor' ? 'role-tag-professor' : 'role-tag-student';

  const badgeLabel =
    user?.badgeText ??
    (user?.role === 'professor' ? 'Professor' : user?.role === 'student' ? 'Student' : null);

  return (
    <nav className="top-bar">
      <div className="top-bar-content">
        {/* ── Left: logo + title  OR  plain back-button ──────── */}
        <div className="top-bar-left">
          {onLeftClick ? (
            <button
              type="button"
              onClick={onLeftClick}
              className="top-bar-left-button"
            >
              {logo && (
                <img
                  src={logo}
                  alt="logo"
                  className="top-bar-logo"
                />
              )}
              {title && <span className="top-bar-title">{title}</span>}
            </button>
          ) : (
            <div className="top-bar-left-button top-bar-left-button--static">
              {logo && (
                <img
                  src={logo}
                  alt="logo"
                  className="top-bar-logo"
                />
              )}
              {title && <span className="top-bar-title">{title}</span>}
            </div>
          )}
        </div>
        {/* ── Right: user info  +  action buttons ────────────── */}
        <div className="top-bar-right">
          {user && <NotificationPanel user={user} role={user.role} appointments={appointments} />}
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

          {actions.map(({ label, onClick, className: actionClassName }, i) => (
            <button
              key={i}
              type="button"
              className={['top-bar-button', actionClassName].filter(Boolean).join(' ')}
              onClick={onClick}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
    </nav>
  );
}
