// AMANDA TRAN
// Professor home base: calendar in the middle, shortcuts and heatmap tools on the side.

import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppShellSession from '../hooks/useAppShellSession';
import logo from '../assets/logo1.png';
import Navbar from '../components/Navbar';
import calendarIcon from '../assets/calendarIcon.png';
import coursesIcon from '../assets/courseIcon.png';
import searchIcon from '../assets/searchIcon.png';
import createAvailabilityIcon from '../assets/createAvailabilityIcon.png';
import InfoIcon from '../assets/infoIcon.png';
import { DeleteConfirmModal, HelpGuideModal, SlotDetailModal } from '../components/Modals';
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
  updateAvailability,
  getProfessorAvailabilities,
} from '../api/availabilities';
import { getHeatmaps } from '../api/heatmaps';
import CreateAvailabilityModal from '../components/CreateAvailabilityModal';
import { DASHBOARD_HELP_GUIDES } from '../data/helpGuides';

import Sidebar from '../components/Sidebar'; 
import '../styles/Dashboard.css';
import { logout } from '../api/auth';

export default function ProfessorDashboard() {
  // Used for every "take me somewhere else" action on this dashboard.
  const navigate = useNavigate();
  // The app shell already knows who is logged in, so we reuse that here.
  const { user, userId } = useAppShellSession();

  // Log out first, then drop the professor back at the public landing page.
  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  // Real bookings hosted by this professor.
  const [appointments, setAppointments] = useState([]);
  // Open availability blocks that have not been turned into bookings.
  const [availabilities, setAvailabilities] = useState([]);
  // Keeps the sidebar highlight feeling responsive.
  const [sideTab, setSideTab] = useState('calendar');
  // One modal controller, plus the appointment/slot that modal is talking about.
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);
  // Recent heatmaps live in the right panel so professors can jump back in quickly.
  const [heatmaps, setHeatmaps] = useState([]);
  // Basic page feedback.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);


  // Load the two things the calendar needs: booked meetings and open slots.
  useEffect(() => {
    if (!userId) return;

    async function loadDashboardData() {
      try {
        setLoading(true);

        // These requests do not depend on each other, so we ask for them together.
        const [appointmentData, availabilityData] = await Promise.all([
          getHostingAppointments(userId),
          getProfessorAvailabilities(userId),
        ]);

        // Appointments need a little reshaping before the calendar can draw them.
        setAppointments(appointmentData.map(mapAppointmentToCalendarEvent));
        setAvailabilities(availabilityData);
        setError('');
      } catch (err) {
        // Keep the page up and show a readable error instead of failing silently.
        setError(err.message);
      } finally {
        // Either way, the initial load attempt is done.
        setLoading(false);
      }
    }

    loadDashboardData();
  }, [userId]);

  // Heatmaps are separate from the calendar, but the side panel needs them.
  useEffect(() => {
    // If the professor leaves this page mid-request, ignore the late response.
    let active = true;

    async function loadHeatmaps() {
      try {
        const data = await getHeatmaps({ created_by: userId });
        if (!active) return;
        setHeatmaps(data);
      } catch (err) {
        if (!active) return;
        // Do not wipe out a more useful calendar-load error.
        setError((prev) => prev || err.message);
      }
    }

    loadHeatmaps();

    return () => {
      active = false;
    };
  }, [userId]);


  // Navbar name. While the session is warming up, use a harmless fallback.
  const currentUser = useMemo(
    () => !user
      ? { firstName: 'User', lastName: String(userId ?? '') }
      : { firstName: user.first_name || 'User', lastName: user.last_name || String(userId ?? '') },
    [user, userId]
  );

  
  // The calendar draws real appointments and still-open availability in one view.
  const calendarEvents = useMemo(() => {
    const myName = `${currentUser.firstName} ${currentUser.lastName}`;

    // Open availability should disappear anywhere a real appointment already exists.
    const appointmentRanges = appointments.map((appt) => ({
      start: new Date(appt.startTime).getTime(),
      end: new Date(appt.endTime).getTime(),
    }));

    const availabilityEvents = availabilities
      .filter((slot) => {
        const availabilityStart = new Date(slot.start_time).getTime();
        const availabilityEnd = new Date(slot.end_time).getTime();

        // Overlapping means this is no longer truly open time.
        return !appointmentRanges.some(
          ({ start, end }) => availabilityStart < end && availabilityEnd > start
        );
      })
      // The calendar only wants one event shape, no matter where the data came from.
      .map((slot) => mapAvailabilityToCalendarEvent(slot, myName));

    // Booked meetings first, then remaining open blocks.
    return [...appointments, ...availabilityEvents];
  }, [appointments, availabilities, currentUser]);

  // A small "what is next?" list for the right panel.
  const upcomingAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => new Date(a.startTime) >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
  }, [appointments]);

  // Keep old appointments findable without crowding the main calendar.
  const pastAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => new Date(a.startTime) < now && a.status !== 'cancelled')
      .sort((a, b) => new Date(b.startTime) - new Date(a.startTime));
  }, [appointments]);

  
  // Same delete button, two possible meanings: remove an open slot or cancel a booking.
  async function handleDelete() {
    if (!activeAppt) return;

    try {
      // Availability rows and appointments live behind different APIs.
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

      // The UI can update immediately after the server confirms the change.
      setActiveAppt(null);
      setModal(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // Save a new open slot from the modal, then put it on the calendar right away.
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

  async function handleUpdateAvailability(payload) {
    if (!activeAppt || activeAppt.type !== 'availability') return;

    try {
      const result = await updateAvailability(activeAppt.rawId, {
        updated_by: Number(userId),
        ...payload,
      });

      const updatedAvailability = result.availability;

      setAvailabilities((prev) =>
        prev.map((slot) =>
          Number(slot.availability_id) === Number(activeAppt.rawId)
            ? updatedAvailability
            : slot
        )
      );

      setModal(null);
      setActiveAppt((prev) =>
        prev
          ? {
              ...prev,
              title: updatedAvailability.av_title || prev.title,
              location: updatedAvailability.location || prev.location,
              startTime: updatedAvailability.start_time,
              endTime: updatedAvailability.end_time,
              visibility: updatedAvailability.visibility,
              capacity: updatedAvailability.capacity,
            }
          : prev
      );
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
        {/* Top bar with identity, logout, and the right-panel toggle. */}
        <Navbar
          logo={logo}
          title="Dashboard Calendar"
          onLeftClick={() => navigate('/')}
          user={{
            displayName: `${currentUser.lastName}, ${currentUser.firstName}`,
            role: 'professor',
            initials,
          }}
          actions={[
            // Professors can hide the side panel when they want more room for the calendar.
            { label: rightPanelOpen ? 'Hide panel' : 'Show panel', onClick: () => setRightPanelOpen((open) => !open) },
            { label: 'Log Out', onClick: handleLogout },
          ]}
        />

        <div className="dashboard-layout">
          {/* Left navigation for the professor's main tools. */}
          <Sidebar
            activeId={sideTab}
            items={[
              { id: 'calendar', icon: calendarIcon, label: 'Calendar', onClick: () => setSideTab('calendar') },
              { id: 'courses', icon: coursesIcon, label: 'Courses', onClick: () => navigate('/courses') },
              { id: 'search', icon: searchIcon, iconClassName: 'side-menu-icon-img-search', label: 'Search', onClick: () => navigate('/booking/search') },
              { id: 'create', icon: createAvailabilityIcon, label: 'Create availability', onClick: () => setModal('createAvailability') },
            ]}
            bottomItems={[
              { id: 'help', icon: InfoIcon, iconClassName: 'side-menu-icon-img-info', label: 'Help', onClick: () => setModal('help') },
            ]}
          />

          {/* Calendar in the center, summaries and heatmap shortcuts on the right. */}
          <div className="main-content">
            {loading && <p style={{ padding: 16 }}>Loading appointments...</p>}
            {error && <p style={{ padding: 16, color: 'red' }}>{error}</p>}

            {/* Weekly calendar for both booked meetings and open availability. */}
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

            {/* Right panel: quick context without leaving the calendar. */}
            {rightPanelOpen && (
              <aside className="side-panel">
                {/* Quick look at what is coming up soon. */}
              <div>
                <div className="side-panel-title">Upcoming appointments</div>
                {upcomingAppts.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa' }}>No upcoming appointments.</p>
                ) : (
                  upcomingAppts.map((appt) => {
                    // Status values from the backend get turned into friendly labels.
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

              {/* Heatmap shortcuts: create a new poll or reopen a recent one. */}
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

                {/* Recent heatmaps stay close because professors often return to review responses. */}
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

      {/* Form for publishing a new availability slot. */}
      {modal === 'createAvailability' && (
        <CreateAvailabilityModal
          onClose={() => setModal(null)}
          onSubmit={handleCreateAvailability}
        />
      )}

      {modal === 'editAvailability' && activeAppt && (
        <CreateAvailabilityModal
          title="Edit availability"
          submitLabel="Save changes"
          initialData={{
            av_title: activeAppt.title,
            av_description: activeAppt.description,
            location: activeAppt.location,
            start_time: activeAppt.startTime,
            end_time: activeAppt.endTime,
            capacity: activeAppt.capacity,
            visibility: activeAppt.visibility,
            recurrence_rule: activeAppt.recurrence_rule || '',
          }}
          onClose={() => setModal('detail')}
          onSubmit={handleUpdateAvailability}
        />
      )}

      {/* Opens when the professor clicks an appointment or availability block for more detail. */}
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
            type: activeAppt.type,
          }}
          isOwner={true}
          onEdit={activeAppt.type === 'availability' ? () => setModal('editAvailability') : undefined}
          onDelete={() => setModal('delete')}
          onClose={() => {
            setModal(null);
            setActiveAppt(null);
          }}
        />
      )}

      {/* Last check before removing an open slot or cancelling a booked meeting. */}
      {modal === 'delete' && activeAppt && (
        <DeleteConfirmModal
          appointment={{
            title: activeAppt.title,
            day: new Date(activeAppt.startTime).toLocaleDateString(),
            time: formatTime(activeAppt.startTime),
            notifyEmail: activeAppt.type === 'availability' ? '' : activeAppt.attendeeEmail,
          }}
          onConfirm={handleDelete}
          onClose={() => setModal('detail')}
        />
      )}

      {/* Professor-specific help from the sidebar info button. */}
      {modal === 'help' && (
        <HelpGuideModal
          guide={DASHBOARD_HELP_GUIDES.professor}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
