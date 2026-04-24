//AMANDA TRAN
/*GENERATED CODE FROM ChatGPT - INDICATED IN THE RELEVANT SECTION BELLOW : 
This code was use to help showcase upcoming appointments - user friendly */

// Core React hooks plus router navigation for moving between pages.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppShellSession from '../hooks/useAppShellSession';
import logo from '../assets/LGTMLogo2.png';
import Navbar from '../components/Navbar';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import InfoIcon from '@mui/icons-material/Info';
import { DeleteConfirmModal, HelpGuideModal, SlotDetailModal } from '../components/Modals';
import Calendar from '../components/calendar/Calendar';
import {
  formatDate,
  formatTime,
  statusLabel,
  mapAppointmentToCalendarEvent,
  includeAppointmentOnWeekCalendar,
  formatRecurrenceSubtitleLine,
} from '../components/calendar/calendarUtils';
import { getMyAppointments, cancelAppointment, updateMyParticipantStatus } from '../api/appointments';
import { getHeatmaps } from '../api/heatmaps';
import { logout } from '../api/auth';
import { DASHBOARD_HELP_GUIDES } from '../data/helpGuides';

// Reusable sidebar component instead of hardcoding the left menu here.
import Sidebar from '../components/Sidebar'; 
import '../styles/Dashboard.css';



export default function StudentDashboard() {
  // Router helper for moving from the dashboard to search, heatmaps, or home.
  const navigate = useNavigate();
  // Shared session hook gives this page the logged-in student and their database ID.
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
  const [infoMessage, setInfoMessage] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);

  // When the logged-in student changes, fetch their appointments and heatmap invites from the server.
  useEffect(() => {
    if (!userId) return;

    async function loadAppointments() {
      try {
        setLoading(true);
        // Pull both sets of data together so the dashboard can load in one pass.
        const [data, heatmapData] = await Promise.all([
          getMyAppointments(userId),
          
          getHeatmaps({ participant_user_id: userId }),
        ]);

        // The API shape is not exactly what the calendar wants, so we normalize it first.
        setAppointments(data.map((appt) => mapAppointmentToCalendarEvent(appt, userId)));
        setHeatmaps(heatmapData);
        setError('');
        setInfoMessage('');
      } catch (err) {
        // If anything fails, keep the page alive and show the message instead of crashing.
        setError(err.message);
        setInfoMessage('');
      } finally {
        // Always stop the loading state, even if the request fails.
        setLoading(false);
      }
    }

    loadAppointments();
    // Run again if the logged-in user changes.
  }, [userId]);

  useEffect(() => {
    if (!infoMessage) return;
    const t = window.setTimeout(() => setInfoMessage(''), 10000);
    return () => window.clearTimeout(t);
  }, [infoMessage]);

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
      .filter((a) => includeAppointmentOnWeekCalendar(a) && new Date(a.startTime) >= now)
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 10);
  }, [appointments]);

  // Side panel shows one card per recurring series to avoid repetition.
  const upcomingPanelAppts = useMemo(() => {
    const grouped = [];
    const recurringIndexByGroup = new Map();

    upcomingAppts.forEach((appt) => {
      const recurringGroupId = appt.recurrence_group_id;

      if (!recurringGroupId) {
        grouped.push({
          appt,
          seriesCount: 1,
          isSeriesCard: false,
        });
        return;
      }

      if (!recurringIndexByGroup.has(recurringGroupId)) {
        recurringIndexByGroup.set(recurringGroupId, grouped.length);
        grouped.push({
          appt,
          seriesCount: 1,
          isSeriesCard: true,
        });
        return;
      }

      const idx = recurringIndexByGroup.get(recurringGroupId);
      grouped[idx].seriesCount += 1;
    });

    return grouped;
  }, [upcomingAppts]);

  /*CODE GENERATED FROM ChatGPT ENDS HERE*/
  /*__________________________________________________________________________*/


  const weekCalendarAppointments = useMemo(
    () => appointments.filter(includeAppointmentOnWeekCalendar),
    [appointments]
  );

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
            ? { ...a, status: 'cancelled', appointmentStatus: 'cancelled', color: '#777777' }
            : a
        )
      );

      setActiveAppt(null);
      setModal(null);
      setError('');
      setInfoMessage('Appointment cancelled.');
    } catch (err) {
      setInfoMessage('');
      setError(err.message);
    }
  }

  async function handleUpdateMyStatus(appointmentId, nextStatus) {
    try {
      await updateMyParticipantStatus(appointmentId, userId, nextStatus);

      const mergeParticipantUpdate = (appt) => {
        if (appt.id !== appointmentId) return appt;
        const participantStatuses = (appt.participantStatuses || []).map((p) =>
          Number(p.userId) === Number(userId) ? { ...p, status: nextStatus } : p
        );
        const attendeeStatuses = participantStatuses.filter((p) => p.role === 'attendee');
        const allConfirmed = attendeeStatuses.length > 0 && attendeeStatuses.every((p) => p.status === 'confirmed');
        const allCancelled = attendeeStatuses.length > 0 && attendeeStatuses.every((p) => p.status === 'cancelled');
        const nextApptStatus = allConfirmed ? 'confirmed' : allCancelled ? 'cancelled' : 'pending';

        return {
          ...appt,
          attendeeStatus: nextStatus,
          participantStatuses,
          attendeeStatuses,
          status: nextApptStatus,
          appointmentStatus: nextApptStatus,
        };
      };

      setAppointments((prev) => prev.map(mergeParticipantUpdate));
      setActiveAppt((prev) => (prev && prev.id === appointmentId ? mergeParticipantUpdate(prev) : prev));
      setError('');
      setInfoMessage('Your response was saved.');
    } catch (err) {
      setInfoMessage('');
      setError(err.message);
    }
  }

  // Small initials badge used by the navbar profile area.
  const initials = `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`;

  const showFloatingToast = loading || Boolean(error) || Boolean(infoMessage);
  const floatingToastType = loading ? 'loading' : error ? 'error' : 'success';
  const floatingToastText = loading
    ? 'Loading appointments…'
    : error || infoMessage;

  return (
    <>
      <div className="dashboard-page">
        {showFloatingToast && (
          <div
            className={`dashboard-toast dashboard-toast--${floatingToastType}`}
            role={floatingToastType === 'error' ? 'alert' : 'status'}
            aria-live={floatingToastType === 'error' ? 'assertive' : 'polite'}
          >
            <span className="dashboard-toast-text">{floatingToastText}</span>
            {floatingToastType !== 'loading' && (
              <button
                type="button"
                className="dashboard-toast-dismiss"
                aria-label="Dismiss"
                onClick={() => {
                  setError('');
                  setInfoMessage('');
                }}
              >
                ×
              </button>
            )}
          </div>
        )}

        {/* Whole dashboard shell: navbar on top, sidebar/calendar/panel underneath. */}
        {/* Top navigation bar with the page title, profile badge, and quick actions. */}
        <Navbar
          logo={logo}
          title="Dashboard Calendar"
          user={{
            displayName: `${currentUser.lastName}, ${currentUser.firstName}`,
            role: 'student',
            initials,
          }}
          actions={[
            // Lets the student reclaim calendar space when the side summary is not needed.
            { label: rightPanelOpen ? 'Hide panel' : 'Show panel', onClick: () => setRightPanelOpen((open) => !open) },
            // Ends the current session and returns to the landing page.
            { label: 'Log Out', onClick: handleLogout },
          ]}
        />

        <div className="dashboard-layout">
          {/* Reusable Left sidebar for quick navigation between dashboard actions. */}
    
          <Sidebar
            activeId={sideTab}
            items={[
              // Calendar stays local; courses and search open their dedicated pages.
              { id: 'calendar', iconComponent: CalendarMonthIcon, label: 'Calendar', onClick: () => setSideTab('calendar') },
              { id: 'courses', iconComponent: CollectionsBookmarkOutlinedIcon, label: 'Courses', onClick: () => navigate('/courses') },
              // Search opens the booking discovery flow where students find professors.
              { id: 'search', iconComponent: SearchIcon, label: 'Search', onClick: () => navigate('/booking/search') },
            ]}
            bottomItems={[
              // Help is kept at the bottom of the sidebar for consistent access.
              { id: 'help', iconComponent: InfoIcon, label: 'Help', onClick: () => setModal('help') },
            ]}
          />

          {/* Main dashboard body: calendar in the middle, extra info on the right. */}
          <div className="main-content">
            {!loading && (
              // Main week calendar. Clicking any event opens the detail modal below.
              <Calendar
                view="week"
                appointments={weekCalendarAppointments}
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
              <div className="side-panel-section side-panel-section-upcoming">
                <div className="side-panel-title">Upcoming appointments</div>
                <div className="side-panel-scroll">
                  {upcomingPanelAppts.length === 0 ? (
                    // Empty state keeps the panel from looking broken when there is no data.
                    <p style={{ fontSize: 12, color: '#aaa' }}>No upcoming appointments.</p>
                  ) : (
                    upcomingPanelAppts.map(({ appt, seriesCount, isSeriesCard }) => {
                      // Convert raw status into label + CSS class for the pill.
                      const { label, cls } = statusLabel(appt.status);
                      const recurrenceSummary = formatRecurrenceSubtitleLine({
                        recurrence_rule: appt.recurrence_rule,
                        recurrence_group_id: appt.recurrence_group_id,
                      });

                      return (
                        // Each card is clickable so students can review or cancel from the modal.
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
                            {appt.recurrence_group_id && (
                              <p className="appointment-recurrence-line">
                                {recurrenceSummary || 'Part of a recurring series'}
                                {isSeriesCard && seriesCount > 1 ? ` • +${seriesCount - 1} more` : ''}
                              </p>
                            )}
                          </div>
                          <span className={`appointment-status-pill ${cls}`}>{label}</span>
                          {appt.attendeeStatus === 'pending' && (
                            <div style={{ display: 'grid', gap: 6 }}>
                              <button
                                type="button"
                                className="invite-action-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateMyStatus(appt.id, 'confirmed');
                                }}
                                title="Set your status to confirmed"
                              >
                                ✓
                              </button>
                              <button
                                type="button"
                                className="invite-action-button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleUpdateMyStatus(appt.id, 'cancelled');
                                }}
                                title="Set your status to cancelled"
                              >
                                ×
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="side-panel-divider" />

              {/* Heatmap invites are shown as action items the student may still need to respond to. */}
              <div className="side-panel-section side-panel-section-heatmap">
                <div className="side-panel-title">Heatmap invitations</div>
                <div className="side-panel-scroll">
                  {heatmapInvites.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#aaa' }}>No heatmap invitations right now.</p>
                  ) : (
                    heatmapInvites.map((inv) => (
                      // One invitation card per heatmap the student can view or respond to.
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
                          {/* Plus means action needed; arrow means they already responded. */}
                          {inv.responded ? '>' : '+'}
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

      {/* Opens when a student clicks an appointment to see the full details. */}
      {modal === 'detail' && activeAppt && (
        /* The modal expects a smaller display object, so reshape the calendar event here. */
        <SlotDetailModal
          appointment={{
            title: activeAppt.title,
            startTime: activeAppt.startTime,
            endTime: activeAppt.endTime,
            day: new Date(activeAppt.startTime).toLocaleDateString('en-CA', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
            time: `${formatTime(activeAppt.startTime)} – ${formatTime(activeAppt.endTime)}`,
            owner: activeAppt.ownerName,
            ownerEmail: activeAppt.ownerEmail,
            attendeeName: activeAppt.attendeeName,
            attendeeEmail: activeAppt.attendeeEmail,
            bookedBy: activeAppt.attendeeName,
            location: activeAppt.location,
            description: activeAppt.description,
            notes: activeAppt.notes || activeAppt.description,
            capacity: activeAppt.capacity,
            visibility: activeAppt.visibility,
            bookedCount: activeAppt.bookedCount,
            status: activeAppt.status,
            type: activeAppt.type,
            participants: activeAppt.participantStatuses || [],
            myStatus: activeAppt.attendeeStatus,
            currentUserId: userId,
            recurrence_rule: activeAppt.recurrence_rule,
            recurrence_group_id: activeAppt.recurrence_group_id,
            recurrence_instance_date: activeAppt.recurrence_instance_date,
            course_id: activeAppt.course_id,
          }}
          isOwner={false}
          onUpdateMyStatus={(nextStatus) => handleUpdateMyStatus(activeAppt.id, nextStatus)}
          onDelete={() => setModal('delete')}
          onClose={() => {
            setModal(null);
            setActiveAppt(null);
          }}
        />
      )}
      {/* Second modal that asks for confirmation before actually cancelling the appointment. */}
      {modal === 'delete' && activeAppt && (
        /* This gives the confirmation modal the exact text it needs to show. */
        <DeleteConfirmModal
          appointment={{
            title: activeAppt.title,
            day: new Date(activeAppt.startTime).toLocaleDateString(),
            time: formatTime(activeAppt.startTime),
            notifyEmail: activeAppt.ownerEmail,
            type: activeAppt.type,
            participants: activeAppt.participantStatuses || [],
            attendeeName: activeAppt.attendeeName,
            attendeeEmail: activeAppt.attendeeEmail,
            bookedBy: activeAppt.attendeeName,
            recurrence_rule: activeAppt.recurrence_rule,
            recurrence_group_id: activeAppt.recurrence_group_id,
            course_id: activeAppt.course_id,
          }}
          onConfirm={handleDelete}
          onClose={() => setModal('detail')}
        />
      )}

      {/* Page-specific help opened from the info icon in the sidebar. */}
      {modal === 'help' && (
        <HelpGuideModal
          guide={DASHBOARD_HELP_GUIDES.student}
          onClose={() => setModal(null)}
        />
      )}
    </>
  );
}
