/*AMANDA TRAN*/

import React from 'react';
import '../styles/Sidebar.css';

/**
 * Sidebar — reusable left navigation bar used across dashboard pages.
 
 */
export default function Sidebar({ items = [], activeId, bottomItems = [] }) {
  function renderButton({ id, icon, iconText, label, onClick, iconClassName = '' }) {
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
            className={`side-menu-icon-img${iconClassName ? ` ${iconClassName}` : ''}`}
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
