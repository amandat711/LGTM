//AMANDA TRAN
/*GENERATED CODE FROM ChatGPT - INDICATED IN THE RELEVANT SECTION BELLOW : 
This code was use to help showcase upcoming appointments - user friendly */

// Core React hooks plus router navigation for moving between pages.
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

// Reusable sidebar component instead of hardcoding the left menu here.
import Sidebar from '../components/Sidebar'; 
import '../styles/Dashboard.css';
export default function StudentDashboard() {
  const navigate = useNavigate();
  const { user, userId } = useAppShellSession();

  // Logs the student out, then sends them back to the landing page no matter what.
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  // Main list of appointments shown on the calendar.
  const [appointments, setAppointments] = useState([]);

  // Tracks which sidebar item looks active.
  const [sideTab, setSideTab] = useState('calendar');

  // Keeps track of which modal is open and which appointment the student clicked.
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);

  // Stores any heatmap invitations tied to this student.
  const [heatmaps, setHeatmaps] = useState([]);

  // Basic page status flags for loading, errors, and the right-side panel toggle.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // When the logged-in student changes, fetch their appointments and heatmap invites.
  useEffect(() => {
    if (!userId) return;

    async function loadAppointments() {
      try {
        setLoading(true);
        // Pull both sets of data together so the dashboard can load in one pass.
        const [data, heatmapData] = await Promise.all([
          getMyAppointments(userId),
          
          getHeatmaps({ participant_user_id: userId, include_public: 1 }),
        ]);

        // The API shape is not exactly what the calendar wants, so we normalize it first.
        setAppointments(data.map(mapAppointmentToCalendarEvent));
        setHeatmaps(heatmapData);
        setError('');
      } catch (err) {
        // If anything fails, keep the page alive and show the message instead of crashing.
        setError(err.message);
      } finally {
        // Always stop the loading state, even if the request fails.
        setLoading(false);
      }
    }

    loadAppointments();
    // Run again if the logged-in user changes.
  }, [userId]);

  // Builds the name shown in the navbar, with a fallback in case session data is missing.
  const currentUser = !user
    ? { firstName: 'User', lastName: String(userId ?? '') }
    : {
        firstName: user.first_name || 'User',
        lastName: user.last_name || String(userId ?? ''),
      };


  /*__________________________________________________________________________*/
  /*CODE GENERATE FROM ChatGPT STARTS HERE*/
  // Shows up to ten future appointments so the student can quickly see what is coming next.
  const upcomingAppts = useMemo(() => {
    const now = new Date();

    return appointments
      .filter((a) => new Date(a.startTime) >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 10);
  }, [appointments]);

  /*CODE GENERATED FROM ChatGPT ENDS HERE*/
  /*__________________________________________________________________________*/


  // Keeps older appointments visible as a simple history list in the side panel.
  const pastAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => new Date(a.startTime) < now && a.status !== 'cancelled')
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [appointments]);

  // Shrinks raw heatmap data down to just the fields this page actually needs.
  const heatmapInvites = heatmaps.map((heatmap) => ({
    id: heatmap.id,
    title: heatmap.title,
    profName: heatmap.hostName,
    dueDate: heatmap.noLaterTime || heatmap.createdAt,
    responded: Boolean(heatmap.mySubmission),
    status: heatmap.mySubmission?.status || 'open',
  }));

  // Cancels the selected appointment, then updates local state so the UI reflects it right away.
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

  // Small initials badge used by the navbar profile area.
  const initials = `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`;

  return (
    <>
      <div className="dashboard-page">
        {/* Top navigation bar with the page title, profile badge, and quick actions. */}
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
          {/* Reusable Left sidebar for quick navigation between dashboard actions. */}
    
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

          {/* Main dashboard body: calendar in the middle, extra info on the right. */}
          <div className="main-content">
            {/* Simple feedback while the page is loading or if something goes wrong. */}
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

            {/* Right panel with quick summaries so the student does not have to scan the whole calendar. */}
            {rightPanelOpen && (
              <aside className="side-panel">
                {/* Upcoming items are shown first because they matter the most day-to-day. */}
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
                        <div>
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

              <div>
                <div className="side-panel-title">Past appointments</div>
                {pastAppts.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa' }}>No past appointments yet.</p>
                ) : (
                  pastAppts.map((appt) => {
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
                        <div>
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

              {/* Heatmap invites are shown last as action items the student may still need to respond to. */}
              <div>
                <div className="side-panel-title">Heatmap invitations</div>
                {heatmapInvites.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa' }}>No heatmap invitations right now.</p>
                ) : (
                  heatmapInvites.map((inv) => (
                    <div key={inv.id} className="invite-item">
                      <div className={`invite-dot${inv.responded ? ' responded' : ''}`} />
                      <div>
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

      {/* Opens when a student clicks an appointment to see the full details. */}
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
      {/* Second modal that asks for confirmation before actually cancelling the appointment. */}
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
