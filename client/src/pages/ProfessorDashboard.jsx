import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/logo1.png';
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
  mapAvailabilityToCalendarEvent,
} from '../components/calendar/calendarUtils';
import { getHostingAppointments, cancelAppointment } from '../api/appointments';
import {
  createAvailability,
  deleteAvailability,
  getProfessorAvailabilities,
} from '../api/availabilities';
import CreateAvailabilityModal from '../components/CreateAvailabilityModal';
import '../styles/Dashboard.css';

export default function ProfessorDashboard() {
  const navigate = useNavigate();
  const { userId } = useParams();

  // ─────────────────────────────────────────────────────────────
  // State
  // ─────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [sideTab, setSideTab] = useState('calendar');
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // ─────────────────────────────────────────────────────────────
  // Load professor-hosted appointments from backend
  // ─────────────────────────────────────────────────────────────
useEffect(() => {
  async function loadDashboardData() {
    try {
      setLoading(true);

      const [appointmentData, availabilityData] = await Promise.all([
        getHostingAppointments(userId),
        getProfessorAvailabilities(userId),
      ]);

      setAppointments(appointmentData.map(mapAppointmentToCalendarEvent));
      setAvailabilities(availabilityData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  loadDashboardData();
}, [userId]);

  // ─────────────────────────────────────────────────────────────
  // Derive current user display info from loaded appointment data
  // Fallback to generic values if nothing is found yet
  // ─────────────────────────────────────────────────────────────
  const currentUser = useMemo(() => {
    for (const appt of appointments) {
      const me = appt.participants?.find((p) => Number(p.user_id) === Number(userId));
      if (me) {
        return {
          firstName: me.first_name || 'User',
          lastName: me.last_name || String(userId),
        };
      }
    }

    return {
      firstName: 'User',
      lastName: String(userId),
    };
  }, [appointments, userId]);

  // ─────────────────────────────────────────────────────────────
  // Get up to 5 upcoming non-cancelled appointments
  // ─────────────────────────────────────────────────────────────
  const calendarEvents = useMemo(() => {
    const myName = `${currentUser.firstName} ${currentUser.lastName}`;

    const appointmentRanges = appointments.map((appt) => ({
      start: new Date(appt.startTime).getTime(),
      end: new Date(appt.endTime).getTime(),
    }));

    const availabilityEvents = availabilities
      .filter((slot) => {
        const availabilityStart = new Date(slot.start_time).getTime();
        const availabilityEnd = new Date(slot.end_time).getTime();

        return !appointmentRanges.some(
          ({ start, end }) => availabilityStart < end && availabilityEnd > start
        );
      })
      .map((slot) => mapAvailabilityToCalendarEvent(slot, myName));

    return [...appointments, ...availabilityEvents];
  }, [appointments, availabilities, currentUser]);

  const upcomingAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => new Date(a.startTime) >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
  }, [appointments]);

  // ─────────────────────────────────────────────────────────────
  // Cancel appointment, create + delete availabilities
  // ─────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!activeAppt) return;

    try {
      if (activeAppt.type === 'availability') {
        await deleteAvailability(activeAppt.rawId, userId);

        setAvailabilities((prev) =>
          prev.filter(
            (slot) => Number(slot.availability_id) !== Number(activeAppt.rawId)
          )
        );
      } else {
        await cancelAppointment(activeAppt.id, userId);

        setAppointments((prev) =>
          prev.map((a) =>
            a.id === activeAppt.id
              ? { ...a, status: 'cancelled', color: '#777777' }
              : a
          )
        );
      }

      setActiveAppt(null);
      setModal(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateAvailability(payload) {
    try {
      const result = await createAvailability({
        created_by: Number(userId),
        ...payload,
      });

      setAvailabilities((prev) => [...(result.availabilities || []), ...prev]);
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
      <div className="dash-root">
        {/* ───────────────────────────────────────────────────── */}
        {/* Top Navbar */}
        {/* ───────────────────────────────────────────────────── */}
        <nav className="dash-nav">
          <div className="dash-nav-left">
            <button
              onClick={() => navigate('/')}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
              }}
            >
              <img
                src={logo}
                alt="LGTM"
                className="dash-nav-logo"
                style={{ height: '100px', width: '100px', objectFit: 'contain' }}
              />
            </button>
            <span className="dash-nav-title">Dashboard</span>
          </div>

          <div className="dash-nav-right">
            <span className="dash-nav-name">
              {currentUser.lastName}, {currentUser.firstName}
            </span>
            <span className="dash-nav-role professor">Professor</span>
            <div className="dash-nav-avatar">{initials}</div>

            {/* Restored heatmap button */}
            <button
              className="dash-logout"
              style={{ marginRight: 8 }}
              onClick={() => navigate('/heatmap/1')}
            >
              + New heatmap
            </button>

            <button
              className="dash-logout"
              style={{ marginRight: 8 }}
              onClick={() => setRightPanelOpen((open) => !open)}
            >
              {rightPanelOpen ? 'Hide panel' : 'Show panel'}
            </button>

            <button className="dash-logout" onClick={() => navigate('/')}>
              Back to home
            </button>
          </div>
        </nav>

        <div className="dash-body">
          {/* ─────────────────────────────────────────────────── */}
          {/* Sidebar */}
          {/* ─────────────────────────────────────────────────── */}
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
                  style={{ width: 40, height: 40, objectFit: 'contain' }}
                />
                <span className="dash-sidebar-label">{item.label}</span>
              </button>
            ))}

            <button
              className="dash-sidebar-btn"
              onClick={() => setModal('createAvailability')}
            >
              <span
                style={{
                  width: 40,
                  height: 40,
                  display: 'inline-flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 28,
                  fontWeight: 500,
                  lineHeight: 1,
                }}
              >
                +
              </span>
              <span className="dash-sidebar-label">Create availability</span>
            </button>

            <div className="dash-sidebar-spacer" />

            <button className="dash-sidebar-btn">
              <img
                src={InfoIcon}
                alt="Help"
                style={{ width: 40, height: 40, objectFit: 'contain' }}
              />
            </button>
          </aside>

          {/* ─────────────────────────────────────────────────── */}
          {/* Main dashboard content */}
          {/* ─────────────────────────────────────────────────── */}
          <div className="dash-main">
            {/* Calendar area */}
            {loading && <p style={{ padding: 16 }}>Loading appointments...</p>}
            {error && <p style={{ padding: 16, color: 'red' }}>{error}</p>}

            {!loading && (
              <Calendar
                view="week"
                appointments={calendarEvents}
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
              <aside className="dash-right-panel">
                {/* Upcoming appointments */}
              <div>
                <div className="dash-panel-section-title">Upcoming appointments</div>
                {upcomingAppts.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa' }}>No upcoming appointments.</p>
                ) : (
                  upcomingAppts.map((appt) => {
                    const { label, cls } = statusLabel(appt.status);

                    return (
                      <div
                        key={appt.id}
                        className="dash-appt-card"
                        onClick={() => {
                          setActiveAppt(appt);
                          setModal('detail');
                        }}
                      >
                        <div className="dash-appt-dot" style={{ background: appt.color }} />
                        <div className="dash-appt-info">
                          <h4>{appt.title || 'Untitled appointment'}</h4>
                          <h6>{appt.ownerName}</h6>
                          <p>{formatDate(appt.startTime)}</p>
                          <p>{appt.location}</p>
                        </div>
                        <span className={`dash-appt-status ${cls}`}>{label}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="dash-divider" />

              {/* Heatmap tools - restored intact */}
              <div>
                <div className="dash-panel-section-title">Heatmap tools</div>
                <button
                  className="dash-logout"
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 13,
                    borderRadius: 8,
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                  onClick={() => navigate('/heatmap/1')}
                >
                  + Create new heatmap
                </button>
                <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6 }}>
                  Create a heatmap, share the link with students, and approve their
                  submissions from the heatmap page.
                </p>
              </div>
            </aside>
          )}
          </div>
        </div>
      </div>

      {/* ───────────────────────────────────────────────────── */}
      {/* Create availability modal and appointment detail modal */}
      {/* ───────────────────────────────────────────────────── */}
      {modal === 'createAvailability' && (
        <CreateAvailabilityModal
          onClose={() => setModal(null)}
          onSubmit={handleCreateAvailability}
        />
      )}

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
            bookedBy: activeAppt.attendeeName,
            location: activeAppt.location,
            status: activeAppt.status,
          }}
          isOwner={true}
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