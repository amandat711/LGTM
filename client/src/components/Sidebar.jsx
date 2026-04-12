import React from 'react';
import '../styles/Dashboard.css';

/**
 * Sidebar — reusable left navigation bar used across dashboard pages.
 *
 * Props
 * ─────
 * items        {Array}   Main navigation buttons, rendered top-to-bottom.
 *   .id          {string}    Unique key; matched against activeId for highlight.
 *   .icon        {string}    img src — renders an <img> icon.
 *   .iconText    {string}    Text/symbol used instead of an image (e.g. "+").
 *   .label       {string}    Small label shown below the icon.
 *   .onClick     {Function}  Called when the button is clicked.
 *
 * activeId     {string}   id of the currently active item (highlighted in red).
 *
 * bottomItems  {Array}    Same shape as `items`, but pinned to the bottom.
 *                         Typically used for the Help / Info button.
 */
export default function Sidebar({ items = [], activeId, bottomItems = [] }) {
  function renderButton({ id, icon, iconText, label, onClick }) {
    const isActive = id && id === activeId;

    return (
      <button
        key={id || label}
        className={`side-menu-button${isActive ? ' active' : ''}`}
        onClick={onClick}
      >
        {icon && (
          <img
            src={icon}
            alt={label || ''}
            className="side-menu-icon-img"
            style={{ width: 40, height: 40, objectFit: 'contain' }}
          />
        )}
        {!icon && iconText && (
          <span className="side-menu-icon-text">{iconText}</span>
        )}
        {label && <span className="side-menu-label">{label}</span>}
      </button>
    );
  }

  return (
    <aside className="side-menu">
      {items.map(renderButton)}

      <div className="side-menu-spacer" />

      {bottomItems.map(renderButton)}
    </aside>
  );
}
