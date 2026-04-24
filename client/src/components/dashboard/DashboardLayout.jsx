/*AMANDA TRAN*/

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../../api/auth';
import LGTMLogo2 from '../../assets/LGTMLogo2.png';
import calendarIcon from '../../assets/calendarIcon.png';
import coursesIcon from '../../assets/courseIcon.png';
import searchIcon from '../../assets/searchIcon.png';
import InfoIcon from '../../assets/infoIcon.png';
import '../../styles/Dashboard.css';
import NotificationPanel from './NotificationPanel';

export default function DashboardLayout({
  user,
  roleLabel,
  sideTab,
  setSideTab,
  rightPanel,
  children,
  showHeatmapButton = false,
}) {
  const navigate = useNavigate();
  const initials = `${user.firstName?.[0] || 'U'}${user.lastName?.[0] || ''}`;
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  return (
    <div className="dash-root">
      <nav className="dash-nav">
        <div className="dash-nav-left">
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <img
              src={LGTMLogo2}
              alt="LGTM"
              className="dash-nav-logo"
              style={{ height: '100px', width: '100px', objectFit: 'contain' }}
            />
          </div>
          <span className="dash-nav-title">Dashboard</span>
        </div>

        <div className="dash-nav-right">
          <span className="dash-nav-name">
            {user.lastName}, {user.firstName}
          </span>
          <span className={`dash-nav-role ${roleLabel.toLowerCase()}`}>
            {roleLabel}
          </span>
          <div className="dash-nav-avatar">{initials}</div>

          {showHeatmapButton && (
            <button
              className="dash-logout"
              style={{ marginRight: 8 }}
              onClick={() => navigate('/heatmap/professor/new')}
            >
              + New heatmap
            </button>
          )}

          <button className="dash-logout" onClick={handleLogout}>
            Log Out
          </button>
        </div>
      </nav>

      <div className="dash-body">
        <aside className="dash-sidebar">
          {[
            { id: 'calendar', icon: calendarIcon, label: 'Calendar' },
            { id: 'courses', icon: coursesIcon, label: 'Courses' },
            { id: 'search', icon: searchIcon, label: 'Search' },
          ].map((item) => (
            <button
              key={item.id}
              className={`dash-sidebar-btn${sideTab === item.id ? ' active' : ''}`}
              onClick={() => setSideTab(item.id)}
            >
              <img
                src={item.icon}
                alt={item.label}
                style={{ width: 68, height: 68, objectFit: 'contain' }}
              />
              <span className="dash-sidebar-label">{item.label}</span>
            </button>
          ))}

          <div className="dash-sidebar-spacer" />

          <button className="dash-sidebar-btn">
            <img
              src={InfoIcon}
              alt="Help"
              style={{ width: 36, height: 36, objectFit: 'contain' }}
            />
          </button>
        </aside>

        <div className="dash-main">
          {children}
          {rightPanel}
        </div>
      </div>
    </div>
  );
}
