import React from 'react';
import '../styles/Dashboard.css';

/**
 * Navbar — universal top navigation bar used across all pages.
 *
 * Props
 * ─────
 * logo         {string}    img src for the logo.
 *                          If provided → shows logo on the left.
 *                          If omitted  → left shows a plain text back-button.
 *
 * title        {string}    Text shown next to the logo, OR used as the
 *                          back-button label when no logo is provided.
 *
 * onLeftClick  {Function}  Called when the logo / title area is clicked.
 *
 * user         {object}    Info displayed on the right side (all fields optional).
 *   .displayName {string}  Formatted name shown as plain text.
 *   .role        {string}  "professor" | "student" — controls badge colour.
 *   .initials    {string}  Two-letter initials shown in the avatar bubble.
 *                          If omitted, no avatar is rendered.
 *   .badgeText   {string}  Overrides the default role label
 *                          (e.g. "Student booking" instead of "Student").
 *
 * actions      {Array<{ label: string, onClick: Function }>}
 *              Extra buttons rendered on the right.
 */
export default function Navbar({ logo, title, onLeftClick, user, actions = [] }) {
  const badgeClass = user?.role === 'professor' ? 'professor-badge' : 'student-badge';

  const badgeLabel =
    user?.badgeText ??
    (user?.role === 'professor' ? 'Professor' : user?.role === 'student' ? 'Student' : null);

  return (
    <nav className="navbar-top">

      {/* ── Left: logo + title  OR  plain back-button ──────── */}
      <div className="navbar-left">
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
              className="navbar-logo"
              style={{ height: '100px', width: '100px', objectFit: 'contain' }}
            />
          )}
          {title && <span className="navbar-title">{title}</span>}
        </button>
      </div>

      {/* ── Right: user info  +  action buttons ────────────── */}
      <div className="navbar-right">
        {user && (
          <>
            {user.displayName && (
              <span className="navbar-user-name">{user.displayName}</span>
            )}
            {badgeLabel && (
              <span className={`navbar-user-role ${badgeClass}`}>{badgeLabel}</span>
            )}
            {user.initials && (
              <div className="navbar-user-avatar">{user.initials}</div>
            )}
          </>
        )}

        {actions.map(({ label, onClick }, i) => (
          <button key={i} className="navbar-button" onClick={onClick}>
            {label}
          </button>
        ))}
      </div>

    </nav>
  );
}
