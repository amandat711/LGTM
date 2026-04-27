/* AMANDA TRAN (99% contribution) - Creation */
/* Rita Zhang -> added the mobile responsiveness and dropdown menu for smaller screens */

import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import '../styles/Navbar.css';
import NotificationPanel from './dashboard/NotificationPanel';
import MenuIcon from '@mui/icons-material/Menu';

export default function Navbar({
  logo,
  title,
  onLeftClick,
  user,
  actions = [],
  appointments = [],
}) {
  const [menuOpen, setMenuOpen] = useState(false); // responsive menu for smaller screens

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

          {/* desktop buttons */}
          <div className="top-bar-actions-desktop">
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

          {/* mobile menu button */}
          {actions.length > 0 && (
            <div className="top-bar-actions-mobile">
              <button
                type="button"
                className="top-bar-icon-button"
                onClick={() => setMenuOpen((open) => !open)}
                aria-label="Menu"
              >
                <MenuIcon className="top-bar-menu-icon" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* separate panel for mobile view */}
      {menuOpen && createPortal(
        <div
          className="top-bar-actions-overlay"
          onClick={() => setMenuOpen(false)}
        >
          <div
            className="top-bar-actions-panel"
            onClick={(e) => e.stopPropagation()}
          >
            {actions.map(({ label, onClick, className: actionClassName }, i) => (
              <button
                key={i}
                type="button"
                className={['top-bar-panel-button', i === 0 ? 'top-bar-panel-button-first' : '', actionClassName]
                  .filter(Boolean)
                  .join(' ')}
                onClick={() => {
                  setMenuOpen(false);
                  onClick?.();
                }}
              >
                {label}
              </button>
            ))}
          </div>
        </div>,
        document.body
      )}
    </nav>
  );
}
