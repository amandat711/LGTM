//AMANDA TRAN
/* Some structure here was originally assisted by AI, but the comments below
   explain what each part is doing in plain project language. */

// React hooks for state, effects, and memoized derived values.
import { useEffect, useMemo, useState } from 'react';
// Lets this page navigate to booking, heatmap, or landing routes.
import { useNavigate } from 'react-router-dom';
// Pulls the logged-in professor info from the shared app shell/session.
import useAppShellSession from '../hooks/useAppShellSession';
// Shared visuals and reusable components used by the dashboard UI.
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
  mapAvailabilityToCalendarEvent,
} from '../components/calendar/calendarUtils';
// API helpers for professor-owned appointments.
import { getHostingAppointments, cancelAppointment } from '../api/appointments';
// API helpers for availability slots the professor can create or remove.
import {
  createAvailability,
  deleteAvailability,
  getProfessorAvailabilities,
} from '../api/availabilities';
// Heatmap data is shown in the right panel for quick access.
import { getHeatmaps } from '../api/heatmaps';
import CreateAvailabilityModal from '../components/CreateAvailabilityModal';

// Reusable sidebar component instead of hand-writing the menu here.
import Sidebar from '../components/Sidebar'; 
import '../styles/Dashboard.css';
import { logout } from '../api/auth';

export default function ProfessorDashboard() {
  // Used any time the page needs to redirect somewhere else.
  const navigate = useNavigate();
  // Current professor object plus their numeric ID from session state.
  const { user, userId } = useAppShellSession();

  // Handles logout, then sends the professor back to the landing page.
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  // Hosted appointments that already exist as real bookings.
  const [appointments, setAppointments] = useState([]);
  // Open slots the professor created but students may not have booked yet.
  const [availabilities, setAvailabilities] = useState([]);
  // Only used to keep the sidebar highlight in sync with the last clicked item.
  const [sideTab, setSideTab] = useState('calendar');
  // `modal` says which popup is open, and `activeAppt` says which item it is about.
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);
  // Heatmaps created by this professor, shown in the right-side tools panel.
  const [heatmaps, setHeatmaps] = useState([]);
  // Simple page status flags.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);


  // Main dashboard load:
  // get the professor's booked appointments and open availability slots together.
  useEffect(() => {
    if (!userId) return;

    async function loadDashboardData() {
      try {
        setLoading(true);

        // These are independent requests, so loading them together is faster.
        const [appointmentData, availabilityData] = await Promise.all([
          getHostingAppointments(userId),
          getProfessorAvailabilities(userId),
        ]);

        // Appointment rows from the server are reshaped into calendar-friendly event objects.
        setAppointments(appointmentData.map(mapAppointmentToCalendarEvent));
        setAvailabilities(availabilityData);
        setError('');
      } catch (err) {
        // Save the error so the page can show feedback instead of crashing.
        setError(err.message);
      } finally {
        // Whether it worked or failed, stop showing the loading state.
        setLoading(false);
      }
    }

    loadDashboardData();
    // Re-run if the logged-in professor changes.
  }, [userId]);

  // Heatmaps are loaded separately because they power the tools section in the side panel.
  useEffect(() => {
    // This helps avoid setting state after unmount if the request finishes late.
    let active = true;

    async function loadHeatmaps() {
      try {
        const data = await getHeatmaps({ created_by: userId });
        if (!active) return;
        setHeatmaps(data);
      } catch (err) {
        if (!active) return;
        // Keep the first error if one already exists, instead of overwriting it.
        setError((prev) => prev || err.message);
      }
    }

    loadHeatmaps();

    // Cleanup function for React.
    return () => {
      active = false;
    };
  }, [userId]);


  // Name shown in the navbar.
  // If the session has not loaded fully yet, fall back to a generic label.
  const currentUser = useMemo(
    () => !user
      ? { firstName: 'User', lastName: String(userId ?? '') }
      : { firstName: user.first_name || 'User', lastName: user.last_name || String(userId ?? '') },
    [user, userId]
  );

  
  // The calendar shows two kinds of blocks:
  // 1. real appointments
  // 2. availability slots that are still open
  // We merge them here into one event list for the calendar component.
  const calendarEvents = useMemo(() => {
    const myName = `${currentUser.firstName} ${currentUser.lastName}`;

    // Save appointment time ranges so we can hide availability slots that overlap them.
    const appointmentRanges = appointments.map((appt) => ({
      start: new Date(appt.startTime).getTime(),
      end: new Date(appt.endTime).getTime(),
    }));

    const availabilityEvents = availabilities
      .filter((slot) => {
        const availabilityStart = new Date(slot.start_time).getTime();
        const availabilityEnd = new Date(slot.end_time).getTime();

        // If a slot overlaps an actual appointment, do not show it as open time.
        return !appointmentRanges.some(
          ({ start, end }) => availabilityStart < end && availabilityEnd > start
        );
      })
      // Convert availability rows into the same shape as other calendar events.
      .map((slot) => mapAvailabilityToCalendarEvent(slot, myName));

    // Final calendar = booked appointments + still-visible availability blocks.
    return [...appointments, ...availabilityEvents];
  }, [appointments, availabilities, currentUser]);

  // Short future-facing list for the right panel.
  const upcomingAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => new Date(a.startTime) >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
  }, [appointments]);

  // History list so older appointments do not disappear completely.
  const pastAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => new Date(a.startTime) < now && a.status !== 'cancelled')
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [appointments]);

  
  // Handles both delete flows:
  // deleting an open availability slot or cancelling a booked appointment.
  async function handleDelete() {
    if (!activeAppt) return;

    try {
      // Availability slots and real appointments use different backend actions.
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

      // Close the modal and clear any previous error after a successful action.
      setActiveAppt(null);
      setModal(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // Creates a new availability block from the modal form and adds it to local state.
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

  // Small initials badge shown in the navbar profile area.
  const initials = `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`;

  return (
    <>
      <div className="dashboard-page">
        {/* Top navbar:
            page title, user identity, and quick actions like logout or new heatmap. */}
        <Navbar
          logo={logo}
          title="Dashboard"
          onLeftClick={() => navigate('/')}
          user={{
            displayName: `${currentUser.lastName}, ${currentUser.firstName}`,
            role: 'professor',
            initials,
          }}
          actions={[
            { label: '+ New heatmap', onClick: () => navigate('/heatmap/professor/new') },
            { label: rightPanelOpen ? 'Hide panel' : 'Show panel', onClick: () => setRightPanelOpen((open) => !open) },
            { label: 'Log Out', onClick: handleLogout },
          ]}
        />

        <div className="dashboard-layout">
          {/* Left sidebar for navigation.
              The create button uses a text "+" instead of an image asset. */}
          <Sidebar
            activeId={sideTab}
            items={[
              { id: 'calendar', icon: calendarIcon, label: 'Calendar', onClick: () => setSideTab('calendar') },
              { id: 'courses', icon: coursesIcon, label: 'Courses', onClick: () => setSideTab('courses') },
              { id: 'search', icon: searchIcon, label: 'Search', onClick: () => setSideTab('search') },
              { id: 'create', iconText: '+', label: 'Create availability', onClick: () => setModal('createAvailability') },
            ]}
            bottomItems={[
              { id: 'help', icon: InfoIcon, label: 'Help' },
            ]}
          />

          {/* Main content area:
              the calendar sits in the middle and quick summaries stay on the right. */}
          <div className="main-content">
            {/* Basic loading/error feedback before the full calendar is ready. */}
            {loading && <p style={{ padding: 16 }}>Loading appointments...</p>}
            {error && <p style={{ padding: 16, color: 'red' }}>{error}</p>}

            {/* Weekly calendar view for appointments and still-open availability slots. */}
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

            {/* Right panel:
                upcoming bookings, history, and heatmap shortcuts. */}
            {rightPanelOpen && (
              <aside className="side-panel">
                {/* Quick look at what is coming up soon. */}
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

              {/* Past bookings stay visible here as a lightweight history list. */}
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

              {/* Heatmap section:
                  create a new one fast or reopen a recent one. */}
              <div>
                <div className="side-panel-title">Heatmap tools</div>
                <button
                  className="top-bar-button"
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 13,
                    borderRadius: 8,
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                  onClick={() => navigate('/heatmap/professor/new')}
                >
                  + Create new heatmap
                </button>
                <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6 }}>
                  Create a heatmap, share the link with students, and approve their
                  submissions from the heatmap page.
                </p>

                {/* Small preview list of recent heatmaps for quick access. */}
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {heatmaps.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#888', margin: 0 }}>No heatmaps created yet.</p>
                  ) : (
                    heatmaps.slice(0, 4).map((heatmap) => (
                      <div key={heatmap.id} className="invite-item">
                        <div className={`invite-dot${heatmap.pendingCount > 0 ? '' : ' responded'}`} />
                        <div>
                          <h4>{heatmap.title}</h4>
                          <p>
                            {heatmap.pendingCount} pending · {heatmap.submissionCount} submission{heatmap.submissionCount !== 1 ? 's' : ''}
                          </p>
                          <p style={{ color: '#888' }}>
                            Created {new Date(heatmap.createdAt).toLocaleDateString('en-CA', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <button
                          className="invite-action-button"
                          onClick={() => navigate(`/heatmap/professor/${heatmap.id}`)}
                          title="Open heatmap"
                        >
                          &gt;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          )}
          </div>
        </div>
      </div>

      {/* Opens the form for creating a new availability slot. */}
      {modal === 'createAvailability' && (
        <CreateAvailabilityModal
          onClose={() => setModal(null)}
          onSubmit={handleCreateAvailability}
        />
      )}

      {/* Opens when the professor clicks an appointment or availability block for more detail. */}
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

      {/* Final confirmation before deleting an availability or cancelling a booking. */}
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
