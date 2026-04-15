import React from 'react';
import '../styles/Navbar.css';

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
