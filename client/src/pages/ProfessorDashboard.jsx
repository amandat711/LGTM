//AMANDA TRAN (40% Contribution) - Creation + Frontend logic 
import { useEffect, useMemo, useState } from 'react';

import { useNavigate } from 'react-router-dom';

import useAppShellSession from '../hooks/useAppShellSession';

import logo from '../assets/LGTMLogo2.png';
import Navbar from '../components/Navbar';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import IosShareIcon from '@mui/icons-material/IosShare';
import SyncIcon from '@mui/icons-material/Sync';
import { DeleteConfirmModal, HelpGuideModal, RecurrenceScopeModal, SlotDetailModal } from '../components/Modals';
import Calendar from '../components/calendar/Calendar';
import {
  formatDate,
  formatTime,
  statusLabel,
  mapAppointmentToCalendarEvent,
  mapAvailabilityToCalendarEvent,
  toLocalDateInputValue,
  includeAppointmentOnWeekCalendar,
  formatRecurrenceSubtitleLine,
} from '../components/calendar/calendarUtils';

import {
  getHostingAppointments,
  cancelAppointment,
  createDirectAppointment,
  dismissCancelledAppointment,
  updateAppointment,
  updateMyParticipantStatus,
} from '../api/appointments';

import {
  createAvailability,
  deleteAvailability,
  updateAvailability,
  getProfessorAvailabilities,
} from '../api/availabilities';

import { getHeatmaps } from '../api/heatmaps';
import CreateAvailabilityModal from '../components/CreateAvailabilityModal';
import CreateItemModal from '../components/CreateItemModal';
import CreateAppointmentModal from '../components/CreateAppointmentModal';
import { DASHBOARD_HELP_GUIDES } from '../data/helpGuides';

import Sidebar from '../components/Sidebar';
import ExportCalendarModal from '../components/ExportCalendarModal';
import SyncCalendarModal from '../components/SyncCalendarModal';
import '../styles/Dashboard.css';
import { logout } from '../api/auth';

export default function ProfessorDashboard() {
  const navigate = useNavigate();
  const { user, userId } = useAppShellSession();

  const handleLogout = async () => {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  };

  // Main dashboard state: calendar items, side panel data, and whichever modal is open.
  const [appointments, setAppointments] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [sideTab, setSideTab] = useState('calendar');
  const [modal, setModal] = useState(null);
  const [syncCalendarOpen, setSyncCalendarOpen] = useState(false);
  const [exportCalendarOpen, setExportCalendarOpen] = useState(false);
  const [activeAppt, setActiveAppt] = useState(null);
  const [createStartTime, setCreateStartTime] = useState(null);
  const [createEndTime, setCreateEndTime] = useState(null);
  const [pendingRecurrenceAction, setPendingRecurrenceAction] = useState(null);
  const [pendingAvailabilityPayload, setPendingAvailabilityPayload] = useState(null);
  const [heatmaps, setHeatmaps] = useState([]);

  // Lightweight feedback state for loading, errors, and dismissed cancelled items.
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // only on mobile view is the right panel closed by default
  const [rightPanelOpen, setRightPanelOpen] = useState(() => {
    return window.innerWidth > 768;
  });

  const [infoMessage, setInfoMessage] = useState('');
  const [dismissedCancelledIds, setDismissedCancelledIds] = useState([]);

  // Load appointments and availability together so the calendar paints one complete view.
  useEffect(() => {
    if (!userId) return;

    async function loadDashboardData() {
      try {
        setLoading(true);

        const [appointmentData, availabilityData] = await Promise.all([
          getHostingAppointments(userId),
          getProfessorAvailabilities(userId),
        ]);

        setAppointments(appointmentData.map((appt) => mapAppointmentToCalendarEvent(appt, userId)));
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

  // Heatmaps only feed the shortcut panel, so they can refresh separately.
  useEffect(() => {
    let active = true;

    async function loadHeatmaps() {
      try {
        const data = await getHeatmaps({ created_by: userId });
        if (!active) return;
        setHeatmaps(data);
      } catch (err) {
        if (!active) return;
        setError((prev) => prev || err.message);
      }
    }

    loadHeatmaps();
    return () => {
      active = false;
    };
  }, [userId]);

  useEffect(() => {
    if (!infoMessage) return;
    const t = window.setTimeout(() => setInfoMessage(''), 10000);
    return () => window.clearTimeout(t);
  }, [infoMessage]);

  const currentUser = useMemo(
    () => !user
      ? { firstName: 'User', lastName: String(userId ?? '') }
      : { firstName: user.first_name || 'User', lastName: user.last_name || String(userId ?? '') },
    [user, userId]
  );

  // The calendar mixes booked appointments with still-open office-hour slots.
  const calendarEvents = useMemo(() => {
    const myName = `${currentUser.firstName} ${currentUser.lastName}`;
    const visibleAppointments = appointments.filter(
      (appt) =>
        includeAppointmentOnWeekCalendar(appt)
        && !(appt.status === 'cancelled' && dismissedCancelledIds.includes(Number(appt.id)))
    );

    const appointmentRanges = visibleAppointments.map((appt) => ({
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

    return [...visibleAppointments, ...availabilityEvents];
  }, [appointments, availabilities, currentUser, dismissedCancelledIds]);

  const upcomingAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter(
        (a) =>
          includeAppointmentOnWeekCalendar(a)
          && new Date(a.startTime) >= now
          && !(a.status === 'cancelled' && dismissedCancelledIds.includes(Number(a.id)))
      )
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
  }, [appointments, dismissedCancelledIds]);

  function isRecurringSeriesEvent(appt) {
    return Boolean(appt?.recurrence_group_id);
  }

  function hasMultipleEventsInSeries(appt) {
    const recurrenceGroupId = Number(appt?.recurrence_group_id);
    if (!recurrenceGroupId) return false;
    if (appt?.type === 'availability') {
      return availabilities.filter((slot) => Number(slot.recurrence_group_id) === recurrenceGroupId).length > 1;
    }
    return appointments.filter(
      (item) =>
        Number(item.recurrence_group_id) === recurrenceGroupId &&
        item.appointmentStatus !== 'cancelled'
    ).length > 1;
  }

  function isHostOnlyEvent(appt) {
    if (!appt || appt.type === 'availability') return false;
    const hasAttendeeName = Boolean(appt.attendeeName && appt.attendeeName.trim() && appt.attendeeName !== '—');
    const hasAttendeeParticipant = (appt.participantStatuses || []).some((p) => p.role === 'attendee');
    return !hasAttendeeName && !hasAttendeeParticipant;
  }

  function getRecurrencePivotDate(appt) {
    return appt?.recurrence_instance_date || toLocalDateInputValue(appt?.startTime);
  }

  // Deleting availability and cancelling appointments look similar in the UI,
  // but the backend needs different calls for each case.
  async function executeDeleteWithScope(scope = 'single') {
    if (!activeAppt) return;

    try {
      setInfoMessage('');

      if (activeAppt.type === 'availability') {
        const result = await deleteAvailability(activeAppt.rawId, userId, {
          recurrence_scope: scope,
          pivot_instance_date: getRecurrencePivotDate(activeAppt),
        });
        const availabilityData = await getProfessorAvailabilities(userId);
        setAvailabilities(availabilityData);
        if (result?.skipped?.length > 0) {
          setInfoMessage(
            `Removed ${result.deleted_count} open slot(s). ` +
            `${result.skipped.length} could not be removed (they still have active bookings).`
          );
        }
      } else {
        await cancelAppointment(activeAppt.id, userId, {
          recurrence_scope: scope,
          pivot_instance_date: getRecurrencePivotDate(activeAppt),
        });
        await refreshHostedAppointments();
      }

      setActiveAppt(null);
      setModal(null);
      setPendingRecurrenceAction(null);
      setPendingAvailabilityPayload(null);
      setError('');
    } catch (err) {
      setInfoMessage('');
      setError(err.message);
    }
  }

  // Recurring items ask the professor how much of the series should be changed.
  async function handleDelete() {
    if (!activeAppt) return false;

    if (isRecurringSeriesEvent(activeAppt) && hasMultipleEventsInSeries(activeAppt)) {
      setPendingRecurrenceAction('delete');
      setModal('recurrenceScope');
      return false;
    }

    await executeDeleteWithScope('single');
    return true;
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

  async function refreshHostedAppointments() {
    const appointmentData = await getHostingAppointments(userId);
    setAppointments(appointmentData.map((appt) => mapAppointmentToCalendarEvent(appt, userId)));
  }

  async function handleCreateDirectAppointment(payload) {
    try {
      await createDirectAppointment({
        created_by: Number(userId),
        ...payload,
      });
      await refreshHostedAppointments();
      setModal(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // Save edits to availability while respecting the selected recurrence scope.
  async function executeUpdateAvailabilityWithScope(payload, scope = 'single') {
    if (!activeAppt || activeAppt.type !== 'availability') return;

    try {
      const result = await updateAvailability(activeAppt.rawId, {
        updated_by: Number(userId),
        recurrence_scope: scope,
        pivot_instance_date: getRecurrencePivotDate(activeAppt),
        ...payload,
      });

      const updatedAvailability = result.availability || result.availabilities?.[0] || null;
      const availabilityData = await getProfessorAvailabilities(userId);
      setAvailabilities(availabilityData);

      setModal(null);
      setPendingRecurrenceAction(null);
      setPendingAvailabilityPayload(null);
      if (updatedAvailability) {
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
      }
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateAvailability(payload) {
    if (!activeAppt || activeAppt.type !== 'availability') return;

    if (isRecurringSeriesEvent(activeAppt) && hasMultipleEventsInSeries(activeAppt)) {
      setPendingAvailabilityPayload(payload);
      setPendingRecurrenceAction('edit');
      setModal('recurrenceScope');
      return;
    }

    await executeUpdateAvailabilityWithScope(payload, 'single');
  }

  async function executeUpdateAppointmentWithScope(payload, scope = 'single') {
    if (!activeAppt || activeAppt.type === 'availability') return;
    try {
      await updateAppointment(activeAppt.id, {
        changed_by: Number(userId),
        recurrence_scope: scope,
        pivot_instance_date: getRecurrencePivotDate(activeAppt),
        ...payload,
      });
      await refreshHostedAppointments();
      setModal(null);
      setPendingRecurrenceAction(null);
      setPendingAvailabilityPayload(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleUpdateAppointment(payload) {
    if (!activeAppt || activeAppt.type === 'availability') return;
    if (isRecurringSeriesEvent(activeAppt) && hasMultipleEventsInSeries(activeAppt)) {
      setPendingAvailabilityPayload(payload);
      setPendingRecurrenceAction('editAppointment');
      setModal('recurrenceScope');
      return;
    }
    await executeUpdateAppointmentWithScope(payload, 'single');
  }

  // Participant status changes are reflected locally after the server accepts them.
  async function handleUpdateMyStatus(appointmentId, nextStatus) {
    try {
      await updateMyParticipantStatus(appointmentId, userId, nextStatus);
      const toDisplayStatus = (statuses, fallbackStatus) => {
        const me = statuses.find((p) => Number(p.userId) === Number(userId));
        return me?.status || fallbackStatus || 'pending';
      };

      setAppointments((prev) =>
        prev.map((appt) => {
          if (appt.id !== appointmentId) return appt;
          const participantStatuses = (appt.participantStatuses || []).map((p) =>
            Number(p.userId) === Number(userId) ? { ...p, status: nextStatus } : p
          );
          const status = toDisplayStatus(participantStatuses, appt.status);

          return {
            ...appt,
            participantStatuses,
            status,
          };
        })
      );
      setActiveAppt((prev) => (prev && prev.id === appointmentId ? { ...prev, status: nextStatus } : prev));
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  // Dismiss hides a cancelled item for this professor without deleting it for others.
  async function handleDismissCancelledAppointment(appointmentId) {
    const dismissedId = Number(appointmentId);
    setDismissedCancelledIds((prev) => (
      prev.includes(dismissedId) ? prev : [...prev, dismissedId]
    ));
    setAppointments((prev) => prev.filter((appt) => Number(appt.id) !== dismissedId));
    setActiveAppt((prev) => (prev && Number(prev.id) === dismissedId ? null : prev));
    setModal((prev) => (
      activeAppt && Number(activeAppt.id) === dismissedId ? null : prev
    ));

    try {
      await dismissCancelledAppointment(appointmentId, userId);
      setInfoMessage('Cancelled appointment dismissed.');
      setError('');
    } catch (err) {
      setInfoMessage('');
      setError(err.message);
    }
  }

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

        {/* Main dashboard shell: navbar, left navigation, calendar, and optional side panel. */}
        <Navbar
          logo={logo}
          title="Dashboard Calendar"
          onLeftClick={() => navigate('/')}
          appointments={appointments}
          user={{
            displayName: `${currentUser.lastName}, ${currentUser.firstName}`,
            role: 'professor',
            initials,
          }}
          actions={[

            { label: rightPanelOpen ? 'Hide panel' : 'Show panel', onClick: () => setRightPanelOpen((open) => !open) },

            { label: 'Log Out', onClick: handleLogout },
          ]}
        />

        <div className="dashboard-layout">
          <Sidebar
            activeId={sideTab}
            items={[

              { id: 'calendar', iconComponent: CalendarMonthIcon, label: 'Calendar', onClick: () => setSideTab('calendar') },
              { id: 'courses', iconComponent: CollectionsBookmarkOutlinedIcon, label: 'Courses', onClick: () => navigate('/courses') },
              { id: 'search', iconComponent: SearchIcon, label: 'Search', onClick: () => navigate('/booking/search') },

              { id: 'create', iconComponent: AddIcon, label: 'Create', onClick: () => setModal('createItem') },
            ]}
            bottomItems={[
              {
                id: 'sync-calendar',
                iconComponent: SyncIcon,
                label: 'Sync Calendar',
                onClick: () => setSyncCalendarOpen(true),
              },
              {
                id: 'export-calendar',
                iconComponent: IosShareIcon,
                label: 'Export Calendar',
                onClick: () => setExportCalendarOpen(true),
              },
              { id: 'help', iconComponent: InfoIcon, label: 'Help', onClick: () => setModal('help') },
            ]}
          />

          <div className="main-content">
            {!loading && (
              <Calendar
                view="week"
                appointments={calendarEvents}
                onEventClick={(appt) => {
                  setActiveAppt(appt);
                  setModal('detail');
                }}
                onSlotSelect={({ startIso, endIso }) => {
                  setCreateStartTime(startIso);
                  setCreateEndTime(endIso);
                  setModal('createItem');
                }}
              />
            )}

            {rightPanelOpen && (
              <aside className="side-panel">
                <div className="side-panel-section side-panel-section-upcoming">
                  <div className="side-panel-title">Upcoming appointments</div>
                  <div className="side-panel-scroll">
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
                            {appt.status === 'pending' && (
                              <div style={{ display: 'grid', gap: 6 }}>
                                <button
                                  type="button"
                                  className="invite-action-button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleUpdateMyStatus(appt.id, 'confirmed');
                                  }}
                                  title="Accept request"
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
                                  title="Decline request"
                                >
                                  ×
                                </button>
                              </div>
                            )}
                            {appt.status === 'cancelled' && (
                              <button
                                type="button"
                                className="invite-action-button appointment-delete-button"
                                aria-label="Dismiss cancelled item"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDismissCancelledAppointment(appt.id);
                                }}
                                title="Dismiss cancelled item from your dashboard"
                              >
                                Dismiss
                              </button>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>

                <div className="side-panel-divider" />

                {/* Heatmap shortcuts keep the professor close to group scheduling work. */}
                <div className="side-panel-section side-panel-section-heatmap">
                  <div className="side-panel-title">Heatmap tools</div>
                  <button
                    className="top-bar-button"
                    style={{
                      width: '100%',
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

                  <div className="side-panel-scroll" style={{ marginTop: 12, display: 'grid', gap: 10 }}>
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

      {/* Dashboard modals stay here so they can share the same selected calendar item. */}
      {modal === 'createItem' && (
        <CreateItemModal
          defaultTab="event"
          onClose={() => setModal(null)}
          onCreateAvailability={handleCreateAvailability}
          onCreateDirectAppointment={handleCreateDirectAppointment}
          initialStartTime={createStartTime}
          initialEndTime={createEndTime}
          ownerUserId={userId}
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
            recurrence_group_id: activeAppt.recurrence_group_id,
            course_id: activeAppt.course_id,
          }}
          onClose={() => setModal('detail')}
          onSubmit={handleUpdateAvailability}
        />
      )}

      {modal === 'editAppointment' && activeAppt && (
        <CreateAppointmentModal
          mode="edit"
          initialData={{
            ap_title: activeAppt.title,
            ap_description: activeAppt.description,
            location: activeAppt.location,
            start_time: activeAppt.startTime,
            end_time: activeAppt.endTime,
            capacity: activeAppt.capacity,
            visibility: activeAppt.visibility,
            course_id: activeAppt.course_id,
            ap_color: activeAppt.color,
          }}
          onClose={() => setModal('detail')}
          onSubmit={handleUpdateAppointment}
        />
      )}

      {modal === 'detail' && activeAppt && (
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
            bookedBy: activeAppt.attendeeName,
            attendeeName: activeAppt.attendeeName,
            attendeeEmail: activeAppt.attendeeEmail,
            location: activeAppt.location,
            description: activeAppt.description,
            notes: activeAppt.notes || activeAppt.description,
            capacity: activeAppt.capacity,
            visibility: activeAppt.visibility,
            bookedCount: activeAppt.bookedCount,
            status: activeAppt.status,
            type: activeAppt.type,
            participants: activeAppt.participantStatuses || [],
            myStatus: activeAppt.status,
            currentUserId: userId,
            recurrence_rule: activeAppt.recurrence_rule,
            recurrence_group_id: activeAppt.recurrence_group_id,
            recurrence_instance_date: activeAppt.recurrence_instance_date,
            course_id: activeAppt.course_id,
          }}
          isOwner={true}
          onUpdateMyStatus={
            activeAppt.type !== 'availability'
              ? (nextStatus) => handleUpdateMyStatus(activeAppt.id, nextStatus)
              : undefined
          }
          onDismissCancelled={
            activeAppt.type !== 'availability'
              ? () => handleDismissCancelledAppointment(activeAppt.id)
              : undefined
          }
          onEdit={
            activeAppt.type === 'availability'
              ? () => {
                setPendingRecurrenceAction(null);
                setPendingAvailabilityPayload(null);
                setModal('editAvailability');
              }
              : isHostOnlyEvent(activeAppt)
                ? () => {
                  setPendingRecurrenceAction(null);
                  setPendingAvailabilityPayload(null);
                  setModal('editAppointment');
                }
                : undefined
          }
          onDelete={() => {
            setPendingRecurrenceAction(null);
            setPendingAvailabilityPayload(null);
            setModal('delete');
          }}
          onClose={() => {
            setModal(null);
            setActiveAppt(null);
            setPendingRecurrenceAction(null);
            setPendingAvailabilityPayload(null);
          }}
        />
      )}

      {/* Recurring items use one picker for delete, availability edits, and appointment edits. */}
      {modal === 'recurrenceScope' && activeAppt && (
        <RecurrenceScopeModal
          actionLabel={pendingRecurrenceAction}
          recurrenceSubtitle={formatRecurrenceSubtitleLine({
            recurrence_rule: activeAppt.recurrence_rule,
            recurrence_group_id: activeAppt.recurrence_group_id,
          })}
          onClose={() => {
            setPendingRecurrenceAction(null);
            setPendingAvailabilityPayload(null);
            setModal('detail');
          }}
          onSelect={async (scope) => {
            if (pendingRecurrenceAction === 'delete') {
              await executeDeleteWithScope(scope);
              return;
            }
            if (pendingRecurrenceAction === 'edit') {
              const payload = pendingAvailabilityPayload;
              if (!payload) {
                setModal('detail');
                return;
              }
              await executeUpdateAvailabilityWithScope(payload, scope);
              return;
            }
            if (pendingRecurrenceAction === 'editAppointment') {
              const payload = pendingAvailabilityPayload;
              if (!payload) {
                setModal('detail');
                return;
              }
              await executeUpdateAppointmentWithScope(payload, scope);
            }
          }}
        />
      )}

      {modal === 'delete' && activeAppt && (
        <DeleteConfirmModal
          appointment={{
            title: activeAppt.title,
            day: new Date(activeAppt.startTime).toLocaleDateString(),
            time: formatTime(activeAppt.startTime),
            notifyEmail: activeAppt.type === 'availability' ? '' : activeAppt.attendeeEmail,
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

      {modal === 'help' && (
        <HelpGuideModal
          guide={DASHBOARD_HELP_GUIDES.professor}
          onClose={() => setModal(null)}
        />
      )}

      <SyncCalendarModal
        open={syncCalendarOpen}
        onClose={() => setSyncCalendarOpen(false)}
      />

      <ExportCalendarModal
        open={exportCalendarOpen}
        onClose={() => setExportCalendarOpen(false)}
        userId={userId}
        isFaculty={true}
        exportSource="hosting"
      />
    </>
  );
}
