//AMANDA TRAN

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppShellSession from '../hooks/useAppShellSession';
import logo from '../assets/logo1.png';
import Navbar from '../components/Navbar';
import calendarIcon from '../assets/calendarIcon.png';
import coursesIcon from '../assets/courseIcon.png';
import searchIcon from '../assets/searchIcon.png';
import InfoIcon from '../assets/infoIcon.png';
import { DeleteConfirmModal, SlotDetailModal } from '../components/Modals';
import Calendar from '../components/calendar/Calendar';
import {
  formatDate,
  formatTime,
  statusLabel,
  mapAppointmentToCalendarEvent,
} from '../components/calendar/calendarUtils';
import { getMyAppointments, cancelAppointment } from '../api/appointments';
import { getHeatmaps } from '../api/heatmaps';
import { logout } from '../api/auth';

// [MODIFIED] replaced inline <aside> with reusable Sidebar component
import Sidebar from '../components/Sidebar'; 
import '../styles/Dashboard.css';

export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, userId } = useAppShellSession();
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState([]);
  const [sideTab, setSideTab] = useState('calendar');
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);
  const [heatmaps, setHeatmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // ─────────────────────────────────────────────────────────────
  // Load student appointments from backend
  // ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return;

    async function loadAppointments() {
      try {
        setLoading(true);
        const [data, heatmapData] = await Promise.all([
          getMyAppointments(userId),
          getHeatmaps({ participant_user_id: userId, include_public: 1 }),
        ]);

        setAppointments(data.map(mapAppointmentToCalendarEvent));
        setHeatmaps(heatmapData);
        setError('');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }

    loadAppointments();
  }, [userId]);

  // ─────────────────────────────────────────────────────────────
  // Display name from session (AppShellLayout variant="student")
  // ─────────────────────────────────────────────────────────────
  const currentUser = useMemo(() => {
    if (!user) {
      return { firstName: 'User', lastName: String(userId ?? '') };
    }
    return {
      firstName: user.first_name || 'User',
      lastName: user.last_name || String(userId ?? ''),
    };
  }, [user, userId]);

  // ─────────────────────────────────────────────────────────────
  // Get up to 5 upcoming non-cancelled appointments
  // ─────────────────────────────────────────────────────────────
  const upcomingAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => new Date(a.startTime) >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
  }, [appointments]);

  const heatmapInvites = useMemo(() => {
    return heatmaps.map((heatmap) => ({
      id: heatmap.id,
      title: heatmap.title,
      profName: heatmap.hostName,
      dueDate: heatmap.noLaterTime || heatmap.createdAt,
      responded: Boolean(heatmap.mySubmission),
      status: heatmap.mySubmission?.status || 'open',
    }));
  }, [heatmaps]);

  // ─────────────────────────────────────────────────────────────
  // Cancel appointment
  // This updates backend first, then reflects cancellation in UI
  // ─────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!activeAppt) return;

    try {
      await cancelAppointment(activeAppt.id, userId);

      setAppointments((prev) =>
        prev.map((a) =>
          a.id === activeAppt.id
            ? { ...a, status: 'cancelled', color: '#777777' }
            : a
        )
      );

      setActiveAppt(null);
      setModal(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // ─────────────────────────────────────────────────────────────
  // Avatar initials
  // ─────────────────────────────────────────────────────────────
  const initials = `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`;

  return (
    <>
      <div className="dashboard-page">
        {/* ───────────────────────────────────────────────────── */}
        {/* Top Navbar */}
        {/* ───────────────────────────────────────────────────── */}
        <Navbar
          logo={logo}
          title="Dashboard"
          onLeftClick={() => navigate('/')}
          user={{
            displayName: `${currentUser.lastName}, ${currentUser.firstName}`,
            role: 'student',
            initials,
          }}
          actions={[
            { label: rightPanelOpen ? 'Hide panel' : 'Show panel', onClick: () => setRightPanelOpen((open) => !open) },
            { label: 'Log Out', onClick: handleLogout },
          ]}
        />

        <div className="dashboard-layout">
          
          {/* Sidebar                                           */}
          {/* [MODIFIED] replaced inline <aside> with the      */}
          {/* reusable <Sidebar> component.                    */}
      
          <Sidebar
            activeId={sideTab}
            items={[
              { id: 'calendar', icon: calendarIcon, label: 'Calendar', onClick: () => setSideTab('calendar') },
              { id: 'courses', icon: coursesIcon, label: 'Courses', onClick: () => setSideTab('courses') },
              { id: 'search', icon: searchIcon, label: 'Search', onClick: () => navigate('/booking/search') },
            ]}
            bottomItems={[
              { id: 'help', icon: InfoIcon, label: 'Help' },
            ]}
          />

          {/* ─────────────────────────────────────────────────── */}
          {/* Main dashboard content */}
          {/* ─────────────────────────────────────────────────── */}
          <div className="main-content">
            {/* Calendar area */}
            {loading && <p style={{ padding: 16 }}>Loading appointments...</p>}
            {error && <p style={{ padding: 16, color: 'red' }}>{error}</p>}

            {!loading && (
              <Calendar
                view="week"
                appointments={appointments}
                onEventClick={(appt) => {
                  setActiveAppt(appt);
                  setModal('detail');
                }}
              />
            )}

            {/* ─────────────────────────────────────────────── */}
            {/* Right panel */}
            {/* ─────────────────────────────────────────────── */}
            {rightPanelOpen && (
              <aside className="side-panel">
                {/* Upcoming appointments */}
              <div>
                <div className="side-panel-title">Upcoming appointments</div>
                {upcomingAppts.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa' }}>No upcoming appointments.</p>
                ) : (
                  upcomingAppts.map((appt) => {
                    const { label, cls } = statusLabel(appt.status);

                    return (
                      <div
                        key={appt.id}
                        className="appointment-item"
                        onClick={() => {
                          setActiveAppt(appt);
                          setModal('detail');
                        }}
                      >
                        <div className="appointment-color-dot" style={{ background: appt.color }} />
                        <div className="">
                          <h4>{appt.title || 'Untitled appointment'}</h4>
                          <h6>{appt.ownerName}</h6>
                          <p>{formatDate(appt.startTime)}</p>
                          <p>{appt.location}</p>
                        </div>
                        <span className={`appointment-status-pill ${cls}`}>{label}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="side-panel-divider" />

              {/* Heatmap invitations */}
              <div>
                <div className="side-panel-title">Heatmap invitations</div>
                {heatmapInvites.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa' }}>No heatmap invitations right now.</p>
                ) : (
                  heatmapInvites.map((inv) => (
                    <div key={inv.id} className="invite-item">
                      <div className={`invite-dot${inv.responded ? ' responded' : ''}`} />
                      <div className="">
                        <h4>{inv.profName}</h4>
                        <p>{inv.title}</p>
                        <p style={{ color: inv.responded ? '#888' : '#E31429' }}>
                          {inv.responded
                            ? inv.status === 'approved'
                              ? 'Approved'
                              : inv.status === 'declined'
                                ? 'Declined'
                                : 'Responded'
                            : `Open ${new Date(inv.dueDate).toLocaleDateString('en-CA', {
                                month: 'short',
                                day: 'numeric',
                              })}`}
                        </p>
                      </div>
                      <button
                        className="invite-action-button"
                        onClick={() => navigate(`/heatmap/student/${inv.id}`)}
                        title={inv.responded ? 'View heatmap' : 'Respond to heatmap'}
                      >
                        {inv.responded ? '>' : '+'}
                      </button>
                    </div>
                  ))
                )}
              </div>
            </aside>
          )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────── */}
      {/* Appointment detail modal */}
      {/* ───────────────────────────────────────────────────── */}
      {modal === 'detail' && activeAppt && (
        <SlotDetailModal
          appointment={{
            title: activeAppt.title,
            day: new Date(activeAppt.startTime).toLocaleDateString('en-CA', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
            time: `${formatTime(activeAppt.startTime)} – ${formatTime(activeAppt.endTime)}`,
            owner: activeAppt.ownerName,
            ownerEmail: activeAppt.ownerEmail,
            location: activeAppt.location,
            status: activeAppt.status,
          }}
          isOwner={false}
          onDelete={() => setModal('delete')}
          onClose={() => {
            setModal(null);
            setActiveAppt(null);
          }}
        />
      )}

      {/* ───────────────────────────────────────────────────── */}
      {/* Delete/cancel confirmation modal */}
      {/* ───────────────────────────────────────────────────── */}
      {modal === 'delete' && activeAppt && (
        <DeleteConfirmModal
          appointment={{
            title: activeAppt.title,
            day: new Date(activeAppt.startTime).toLocaleDateString(),
            time: formatTime(activeAppt.startTime),
            notifyEmail: activeAppt.ownerEmail,
          }}
          onConfirm={handleDelete}
          onClose={() => setModal('detail')}
        />
      )}
    </>
  );
}
