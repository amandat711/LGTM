// SHIRLEY DING, 49.3% contribution
import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import useAppShellSession from '../hooks/useAppShellSession';
import { isFacultyAdmin } from '../auth/authUtils';
import {
  assignCourseAdmin,
  deleteCourse,
  getCourse,
  regenerateCourseInvite,
  revokeCourseAdmin,
  updateCourse,
} from '../api/courses';
import { cancelAppointment, createDirectAppointment, joinCourseEvent, updateAppointment } from '../api/appointments';
import { logout } from '../api/auth';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import Calendar from '../components/calendar/Calendar';
import CreateAppointmentModal from '../components/CreateAppointmentModal';
import CourseSettingsModal from '../components/CourseSettingsModal';
import { ConfirmActionModal, InviteURLModal } from '../components/Modals';
import ExportCalendarModal from '../components/ExportCalendarModal';
import logo from '../assets/LGTMLogo2.png';
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth';
import SearchIcon from '@mui/icons-material/Search';
import CollectionsBookmarkOutlinedIcon from '@mui/icons-material/CollectionsBookmarkOutlined';
import InfoIcon from '@mui/icons-material/Info';
import AddIcon from '@mui/icons-material/Add';
import IosShareIcon from '@mui/icons-material/IosShare';
import '../styles/Dashboard.css';
import '../styles/CourseDetailPage.css';

function formatRange(startIso, endIso) {
  if (!startIso) return '';
  const start = new Date(normalizeDateTime(startIso));
  const end = endIso ? new Date(normalizeDateTime(endIso)) : null;
  const opts = { dateStyle: 'medium', timeStyle: 'short' };
  if (end && !Number.isNaN(end.getTime())) {
    return `${start.toLocaleString(undefined, opts)} – ${end.toLocaleString(undefined, opts)}`;
  }
  return start.toLocaleString(undefined, opts);
}

function normalizeDateTime(value) {
  if (!value) return '';
  return String(value).replace(' ', 'T');
}

function inviteLinkFromDetail(detail) {
  if (!detail) return null;
  if (detail.invite_url) return detail.invite_url;
  if (detail.invite_token) {
    return `${window.location.origin}/join?token=${encodeURIComponent(detail.invite_token)}`;
  }
  return null;
}

function mergeEvents(detail) {
  if (!detail) return [];
  const out = [];
  (detail.appointments || []).forEach((row) => {
    out.push({
      kind: 'appointment',
      row,
      start: normalizeDateTime(row.start_time),
      end: normalizeDateTime(row.end_time),
    });
  });
  out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return out;
}

function calendarColorForEvent(_title, _kind, persistedColor) {
  if (persistedColor) return persistedColor;
  return '#1565a8';
}

function formatEventCreatorName(row) {
  if (!row) return '';
  const fn = row.creator_first_name;
  const ln = row.creator_last_name;
  const parts = [fn, ln].filter(Boolean);
  return parts.length ? parts.join(' ') : '';
}

function renderCourseCalendarPopup(eventData, options = {}) {
  const {
    canManage = false,
    canJoin = false,
    onEdit = null,
    onDelete = null,
    onJoin = null,
  } = options;
  if (!eventData) return null;
  return (
    <>
      <div className="dash-event-popover-title">{eventData.title || 'Appointment'}</div>
      <div className="dash-event-popover-time">
        {formatRange(eventData.startTime, eventData.endTime)}
        {eventData.location ? ` · ${eventData.location}` : ''}
      </div>
      {eventData.creatorName ? (
        <div className="dash-event-popover-line">Created by {eventData.creatorName}</div>
      ) : null}
      {canManage && eventData.attendeeCount != null ? (
        <div className="dash-event-popover-line">
          Attendees: {eventData.attendeeCount}/{eventData.capacity}
        </div>
      ) : null}
      {eventData.description ? (
        <div className="dash-event-popover-line">{eventData.description}</div>
      ) : null}
      {canManage ? (
        <div className="dash-event-popover-actions">
          <details className="course-detail-inline-menu" onClick={(e) => e.stopPropagation()}>
            <summary className="course-detail-inline-menu-trigger" aria-label="Event actions">⋯</summary>
            <div className="course-detail-inline-menu-list">
              <button
                type="button"
                className="course-detail-inline-menu-item"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onEdit) onEdit(eventData);
                }}
              >
                Edit
              </button>
              <button
                type="button"
                className="course-detail-inline-menu-item danger"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onDelete) onDelete(eventData);
                }}
              >
                Delete
              </button>
            </div>
          </details>
        </div>
      ) : null}
      {!canManage && canJoin ? (
        <div className="dash-event-popover-actions">
          <button
            type="button"
            className="dash-event-popover-btn"
            onClick={(e) => {
              e.stopPropagation();
              if (onJoin) onJoin(eventData);
            }}
            disabled={Boolean(eventData.isJoined) || eventData.isFull}
          >
            {eventData.isJoined ? 'Joined' : eventData.isFull ? 'Full' : 'Join'}
          </button>
        </div>
      ) : null}
    </>
  );
}

function PersonIcon() {
  return (
    <svg className="course-detail-person-icon" width="22" height="22" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"
      />
    </svg>
  );
}

function ShareIcon() {
  return (
    <svg className="course-detail-inline-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92s2.92-1.31 2.92-2.92-1.31-2.92-2.92-2.92z"
      />
    </svg>
  );
}

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" aria-hidden>
      <path
        fill="currentColor"
        d="M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.09.63-.09.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"
      />
    </svg>
  );
}

export default function CourseDetailPage() {
  const navigate = useNavigate();
  const { courseId: courseIdParam } = useParams();
  const courseId = parseInt(courseIdParam, 10);
  const { user, userId } = useAppShellSession();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionError, setActionError] = useState('');
  const [copyMsg, setCopyMsg] = useState('');
  const [regenerating, setRegenerating] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [closing, setClosing] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [eventsView, setEventsView] = useState('list');
  const [editingEvent, setEditingEvent] = useState(null);
  const [confirmDeleteEvent, setConfirmDeleteEvent] = useState(null);
  const [exportCalendarOpen, setExportCalendarOpen] = useState(false);

  const currentUser = useMemo(
    () => ({
      firstName: user.first_name || 'User',
      lastName: user.last_name || '',
      role: isFacultyAdmin(user.user_type) ? 'professor' : 'student',
    }),
    [user]
  );

  const initials = `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`;

  const loadCourse = useCallback(async () => {
    if (Number.isNaN(courseId) || courseId < 1) {
      setError('Invalid course.');
      setLoading(false);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const data = await getCourse(courseId);
      setDetail(data);
    } catch (err) {
      setDetail(null);
      setError(err.message || 'Failed to load course.');
    } finally {
      setLoading(false);
    }
  }, [courseId]);

  useEffect(() => {
    loadCourse();
  }, [loadCourse]);

  const inviteHref = useMemo(() => inviteLinkFromDetail(detail), [detail]);
  const eventsMerged = useMemo(() => mergeEvents(detail), [detail]);
  const courseCalendarEvents = useMemo(
    () =>
      eventsMerged.map((ev) => {
        const title = ev.row.ap_title || 'Appointment';
        const startTime = normalizeDateTime(ev.row.start_time);
        const endTime = normalizeDateTime(ev.row.end_time);
        if (!startTime || !endTime) return null;
        return {
          id: `course-appointment-${ev.row.appointment_id}`,
          title,
          startTime,
          endTime,
          location: ev.row.location || '',
          status: ev.row.status || '',
          color: calendarColorForEvent(title, ev.kind, ev.row.ap_color),
          creatorName: formatEventCreatorName(ev.row),
          description: ev.row.ap_description || '',
          appointmentId: ev.row.appointment_id,
          isJoined: Number(ev.row.joined_by_viewer || 0) > 0,
          attendeeCount: Number(ev.row.attendee_count || 0),
          capacity: Number(ev.row.capacity || 1),
          isFull: Number(ev.row.attendee_count || 0) >= Number(ev.row.capacity || 1),
        };
      }).filter(Boolean),
    [eventsMerged]
  );

  const course = detail?.course;
  const showInviteSection = Boolean(detail && (course?.is_owner) && inviteHref);
  const showOwnerTools = Boolean(course?.is_owner);
  /** Owners or course admins (assigned staff) may add/delete course calendar events. */
  const canManageCourseEvents = Boolean(course?.is_owner || course?.is_staff);
  const canJoinCourseEvents = Boolean(!canManageCourseEvents);
  const currentUserId = userId != null ? String(userId) : '';
  const semesterLabel = course ? `${course.course_term} ${course.course_year}` : '';

  const courseExportFileName = useMemo(() => {
    const code = detail?.course?.course_code;
    if (!code) return 'lgtm-course-calendar';
    const safe = String(code).replace(/[^a-zA-Z0-9-_]+/g, '-').replace(/^-+|-+$/g, '') || 'course';
    return `lgtm-${safe}-calendar`;
  }, [detail?.course?.course_code]);

  const closeTransientMenus = useCallback(() => {
    if (typeof document === 'undefined') return;
    document.querySelectorAll('.course-detail-inline-menu[open], .course-detail-add-event-dropdown[open]')
      .forEach((el) => el.removeAttribute('open'));
  }, []);

  useEffect(() => {
    function handleDocumentPointerDown(event) {
      const target = event.target;
      if (!(target instanceof Element)) {
        closeTransientMenus();
        return;
      }
      if (target.closest('.course-detail-inline-menu')) return;
      if (target.closest('.course-detail-add-event-dropdown')) return;
      closeTransientMenus();
    }

    document.addEventListener('mousedown', handleDocumentPointerDown);
    return () => document.removeEventListener('mousedown', handleDocumentPointerDown);
  }, [closeTransientMenus]);

  useEffect(() => {
    if (createEventOpen || confirmDeleteEvent || inviteModalOpen || settingsOpen) {
      closeTransientMenus();
    }
  }, [createEventOpen, confirmDeleteEvent, inviteModalOpen, settingsOpen, closeTransientMenus]);

  /** User IDs already on this course as instructors or course admins (string keys for reliable Set lookups). */
  const staffIdSet = useMemo(() => {
    const s = new Set();
    (detail?.owners || []).forEach((row) => {
      if (row?.user_id != null) s.add(String(row.user_id));
    });
    (detail?.staff || []).forEach((row) => {
      if (row?.user_id != null) s.add(String(row.user_id));
    });
    return s;
  }, [detail?.owners, detail?.staff]);

  const sidebarItems = useMemo(
    () => {
      const items = [
        { id: 'calendar', iconComponent: CalendarMonthIcon, label: 'Calendar', onClick: () => navigate('/dashboard/professor?tab=calendar') },
        { id: 'courses', iconComponent: CollectionsBookmarkOutlinedIcon, label: 'Courses', onClick: () => navigate('/courses') },
        { id: 'search', iconComponent: SearchIcon, label: 'Search', onClick: () => navigate('/booking/search') },
      ];
      if (detail?.course?.is_owner) {
        items.push({
          id: 'create',
          iconComponent: AddIcon,
          label: 'Create',
          onClick: () => setCreateEventOpen(true),
        });
      }
      return items;
    },
    [navigate, detail?.course?.is_owner]
  );

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  }

  async function handleRegenerate() {
    if (Number.isNaN(courseId)) return;
    setActionError('');
    setRegenerating(true);
    try {
      const out = await regenerateCourseInvite(courseId);
      setDetail((prev) =>
        prev
          ? {
              ...prev,
              invite_token: out.invite_token,
              invite_url: out.invite_url ?? prev.invite_url,
            }
          : prev
      );
      setCopyMsg('New link generated. Use Copy to share.');
    } catch (err) {
      setActionError(err.message || 'Could not regenerate invite.');
    } finally {
      setRegenerating(false);
    }
  }

  async function handleSaveCourseSettings(payload) {
    const { course: c } = await updateCourse(courseId, payload);
    setDetail((prev) =>
      prev && c ? { ...prev, course: { ...prev.course, ...c } } : prev
    );
  }

  async function handleCreateCourseEvent(payload) {
    if (editingEvent?.appointment_id) {
      await updateAppointment(editingEvent.appointment_id, {
        ...payload,
        changed_by: Number(userId),
      });
      setEditingEvent(null);
      setCreateEventOpen(false);
      await loadCourse();
      return;
    }

    await createDirectAppointment({
      created_by: Number(userId),
      course_id: courseId,
      scheduling_mode: 'calendar',
      status: 'confirmed',
      ...payload,
    });
    setCreateEventOpen(false);
    await loadCourse();
  }

  function handleEditEventFromRow(row) {
    if (!canManageCourseEvents || !row?.appointment_id) return;
    closeTransientMenus();
    setEditingEvent(row);
    setCreateEventOpen(true);
  }

  function requestDeleteEvent(eventRow) {
    if (!canManageCourseEvents || !eventRow?.appointment_id) return;
    closeTransientMenus();
    setConfirmDeleteEvent(eventRow);
  }

  function handleDeleteEventById(appointmentId) {
    if (!canManageCourseEvents || !appointmentId) return;
    setActionError('');
    cancelAppointment(appointmentId, userId)
      .then(loadCourse)
      .catch((err) => setActionError(err.message || 'Could not cancel event.'));
  }

  function handleJoinEventById(appointmentId) {
    if (!canJoinCourseEvents || !appointmentId) return;
    closeTransientMenus();
    setActionError('');
    joinCourseEvent(appointmentId, userId)
      .then(loadCourse)
      .catch((err) => setActionError(err.message || 'Could not join event.'));
  }

  /** Used when saving course settings; caller runs `loadCourse` after all mutations. */
  async function handleAssign(targetUserId) {
    const uid = parseInt(String(targetUserId), 10);
    if (Number.isNaN(uid) || uid < 1) return;
    if (staffIdSet.has(String(uid))) {
      const msg = 'That user is already on the teaching staff for this course.';
      setActionError(msg);
      throw new Error(msg);
    }
    setActionError('');
    try {
      await assignCourseAdmin(courseId, uid);
    } catch (err) {
      const msg = err.message || 'Could not assign admin.';
      setActionError(msg);
      throw err;
    }
  }

  async function handleRevoke(targetUserId) {
    setActionError('');
    try {
      await revokeCourseAdmin(courseId, targetUserId);
    } catch (err) {
      const msg = err.message || 'Could not revoke admin.';
      setActionError(msg);
      throw err;
    }
  }

  async function handleDeleteCourse() {
    setDeleting(true);
    setActionError('');
    try {
      await deleteCourse(courseId);
      navigate('/courses', { replace: true });
    } catch (err) {
      const msg = err.message || 'Could not delete course.';
      setActionError(msg);
      throw err;
    } finally {
      setDeleting(false);
    }
  }

  async function handleCloseCourse() {
    setClosing(true);
    setActionError('');
    try {
      const { course: c } = await updateCourse(courseId, { is_closed: true });
      setDetail((prev) =>
        prev && c ? { ...prev, course: { ...prev.course, ...c } } : prev
      );
    } catch (err) {
      const msg = err.message || 'Could not close course.';
      setActionError(msg);
      throw err;
    } finally {
      setClosing(false);
    }
  }

  return (
    <div className="dashboard-page courses-list-page">
      <Navbar
        logo={logo}
        title="Course"
        user={{
          displayName: `${currentUser.lastName}, ${currentUser.firstName}`,
          role: currentUser.role,
          initials,
        }}
        actions={[{ label: 'Log Out', onClick: handleLogout }]}
      />

      {settingsOpen && course && showOwnerTools && (
        <CourseSettingsModal
          course={course}
          staff={detail?.staff || []}
          staffIdSet={staffIdSet}
          onSaveCourse={handleSaveCourseSettings}
          onAssign={handleAssign}
          onRevoke={handleRevoke}
          onCloseCourse={handleCloseCourse}
          closing={closing}
          onDeleteCourse={handleDeleteCourse}
          onAfterSettingsSave={loadCourse}
          deleting={deleting}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {createEventOpen && (
        <CreateAppointmentModal
          defaultVisibility="public"
          initialData={editingEvent}
          mode={editingEvent ? 'edit' : 'create'}
          forcedCourse={course ? {
            course_id: course.course_id,
            course_code: course.course_code,
            course_name: course.course_name,
          } : null}
          onClose={() => {
            setCreateEventOpen(false);
            setEditingEvent(null);
          }}
          onSubmit={handleCreateCourseEvent}
        />
      )}

      <div className="dashboard-layout">
        <Sidebar
          activeId="courses"
          items={sidebarItems}
          bottomItems={[
            {
              id: 'export-calendar',
              iconComponent: IosShareIcon,
              label: 'Export Calendar',
              onClick: () => setExportCalendarOpen(true),
            },
            { id: 'help', iconComponent: InfoIcon, label: 'Help' },
          ]}
        />

        <div className="main-content">
          <section className="course-detail-shell">
            {loading && <p className="course-detail-muted">Loading course…</p>}
            {!loading && error && <p className="course-detail-error">{error}</p>}

            {!loading && !error && course && (
              <div className="course-detail-grid">
                <div className="course-detail-col course-detail-col--left">
                  <header className="course-detail-hero">
                    <div className="course-detail-hero-top">
                      <div>
                        <div className="course-detail-code-row">
                          <span className="course-detail-code">{course.course_code}</span>
                          {showOwnerTools && (
                            <button
                              type="button"
                              className="course-detail-icon-btn"
                              onClick={() => setSettingsOpen(true)}
                              aria-label="Course settings"
                            >
                              <GearIcon />
                            </button>
                          )}
                        </div>
                        <h1 className="course-detail-title">{course.course_name}</h1>
                        <span className="course-detail-term-pill">{semesterLabel}</span>
                      </div>
                    </div>
                    {course.description ? (
                      <p className="course-detail-description">{course.description}</p>
                    ) : (
                      <p className="course-detail-muted course-detail-description">No description.</p>
                    )}

                    {showInviteSection && (
                      <div className="course-detail-invite-actions">
                        <button type="button" className="course-detail-generate-btn" onClick={() => setInviteModalOpen(true)}>
                          <ShareIcon />
                          Copy invitation link
                        </button>
                        {showOwnerTools && (
                          <button
                            type="button"
                            className="course-detail-btn"
                            onClick={handleRegenerate}
                            disabled={regenerating}
                          >
                            {regenerating ? 'Regenerating…' : 'Regenerate link'}
                          </button>
                        )}
                        {copyMsg ? <span className="course-detail-copy-hint">{copyMsg}</span> : null}
                      </div>
                    )}
                  </header>

                  <section className="course-detail-team">
                    <h2 className="course-detail-section-title">Teaching staff</h2>
                    <ul className="course-detail-team-list">
                      {(detail.owners || []).map((o) => (
                        <li key={`owner-${o.user_id}`} className="course-detail-team-card">
                          <div className="course-detail-team-card-main">
                            <PersonIcon />
                            <div className="course-detail-team-text">
                              <div className="course-detail-team-name">
                                {o.first_name} {o.last_name}
                              </div>
                              <div className="course-detail-team-role">Instructor · {o.department || 'McGill University'}</div>
                            </div>
                          </div>
                          <div className="course-detail-team-actions">
                            {String(o.user_id) !== currentUserId && (
                              <a className="course-detail-icon-link" href={`mailto:${o.mcgill_email}`} aria-label="Email">
                                ✉
                              </a>
                            )}
                            {String(o.user_id) !== currentUserId && (
                              <Link className="course-detail-availability-pill" to={`/booking/professor/${o.user_id}`}>
                                Availability
                              </Link>
                            )}
                          </div>
                        </li>
                      ))}
                      {(detail.staff || []).map((s) => (
                        <li key={`staff-${s.user_id}`} className="course-detail-team-card">
                          <div className="course-detail-team-card-main">
                            <PersonIcon />
                            <div className="course-detail-team-text">
                              <div className="course-detail-team-name">
                                {s.first_name} {s.last_name}
                              </div>
                              <div className="course-detail-team-role">
                                {s.staff_title || 'Teaching Assistant'}
                                {s.department ? ` · ${s.department}` : ''}
                              </div>
                            </div>
                          </div>
                          <div className="course-detail-team-actions">
                            {String(s.user_id) !== currentUserId && (
                              <a className="course-detail-icon-link" href={`mailto:${s.mcgill_email}`} aria-label="Email">
                                ✉
                              </a>
                            )}
                          </div>
                        </li>
                      ))}
                      {(detail.owners || []).length === 0 && (detail.staff || []).length === 0 && (
                        <li className="course-detail-muted">No staff listed.</li>
                      )}
                    </ul>
                  </section>
                </div>

                <div className="course-detail-col course-detail-col--right">
                  <div className="course-detail-events-panel">
                    <div className="course-detail-events-header">
                      <div className="course-detail-events-view-toggle" role="tablist" aria-label="Event display mode">
                        <button
                          type="button"
                          role="tab"
                          aria-selected={eventsView === 'list'}
                          className={`course-detail-events-view-btn${eventsView === 'list' ? ' active' : ''}`}
                          onClick={() => setEventsView('list')}
                        >
                          List
                        </button>
                        <button
                          type="button"
                          role="tab"
                          aria-selected={eventsView === 'calendar'}
                          className={`course-detail-events-view-btn${eventsView === 'calendar' ? ' active' : ''}`}
                          onClick={() => setEventsView('calendar')}
                        >
                          Calendar
                        </button>
                      </div>
                      <h2 className="course-detail-events-title">Events</h2>
                      {canManageCourseEvents && (
                        <details className="course-detail-add-event-dropdown">
                          <summary className="course-detail-add-event-btn">Add event +</summary>
                          <div className="course-detail-add-event-menu">
                            <button
                              type="button"
                              className="course-detail-add-event-item"
                              onClick={() => setCreateEventOpen(true)}
                            >
                              Calendar Booking
                            </button>
                            <button
                              type="button"
                              className="course-detail-add-event-item"
                              onClick={() => navigate('/heatmap/professor/new')}
                            >
                              Heatmap Booking
                            </button>
                          </div>
                        </details>
                      )}
                    </div>
                    {eventsView === 'calendar' ? (
                      eventsMerged.length === 0 ? (
                        <p className="course-detail-muted course-detail-events-empty">No events scheduled.</p>
                      ) : (
                        <>
                          <div className="course-detail-calendar-wrap">
                            <Calendar
                              view="week"
                              appointments={courseCalendarEvents}
                              inlineEventPopup
                              onEventClick={() => {}} //disabling click on calendar event
                              renderInlineEventPopup={(eventData) =>
                                renderCourseCalendarPopup(eventData, {
                                  canManage: canManageCourseEvents,
                                  canJoin: canJoinCourseEvents,
                                  onEdit: (evt) => {
                                    const row = (detail?.appointments || []).find(
                                      (a) => Number(a.appointment_id) === Number(evt.appointmentId)
                                    );
                                    if (row) handleEditEventFromRow(row);
                                  },
                                  onDelete: (evt) => {
                                    const row = (detail?.appointments || []).find(
                                      (a) => Number(a.appointment_id) === Number(evt.appointmentId)
                                    );
                                    if (row) requestDeleteEvent(row);
                                  },
                                  onJoin: (evt) => handleJoinEventById(evt.appointmentId),
                                })
                              }
                            />
                          </div>
                        </>
                      )
                    ) : eventsMerged.length === 0 ? (
                      <p className="course-detail-muted course-detail-events-empty">No events scheduled.</p>
                    ) : (
                      <ul className="course-detail-events-list">
                        {eventsMerged.map((ev) => {
                          const title =
                            ev.row.ap_title || 'Appointment';
                          const eventColor = ev.row.ap_color || calendarColorForEvent(title, ev.kind, ev.row.ap_color);
                          const creatorName = formatEventCreatorName(ev.row);
                          return (
                            <li
                              key={
                                `ap-${ev.row.appointment_id}`
                              }
                              className="course-detail-event"
                              style={{ '--course-event-accent': eventColor }}
                            >
                              <div className="course-detail-event-body">
                                <div className="course-detail-event-title">{title}</div>
                                <div className="course-detail-event-meta">
                                  {formatRange(
                                    ev.row.start_time,
                                    ev.row.end_time
                                  )}
                                  {ev.row.location ? ` · ${ev.row.location}` : ''}
                                </div>
                              {canManageCourseEvents && ev.row.attendee_count != null ? (
                                <div className="course-detail-event-creator">
                                  Attendees: {Number(ev.row.attendee_count)}/{Number(ev.row.capacity || 1)}
                                </div>
                              ) : null}
                                {creatorName ? (
                                  <div className="course-detail-event-creator">Created by {creatorName}</div>
                                ) : null}
                                {ev.row.ap_description ? (
                                  <div className="course-detail-event-desc">{ev.row.ap_description}</div>
                                ) : null}
                              </div>
                              {canManageCourseEvents && (
                                <div className="course-detail-event-actions">
                                  <details className="course-detail-inline-menu">
                                    <summary className="course-detail-inline-menu-trigger" aria-label="Event actions">⋯</summary>
                                    <div className="course-detail-inline-menu-list">
                                      <button
                                        type="button"
                                        className="course-detail-inline-menu-item"
                                        onClick={() => handleEditEventFromRow(ev.row)}
                                      >
                                        Edit
                                      </button>
                                      <button
                                        type="button"
                                        className="course-detail-inline-menu-item danger"
                                        onClick={() => requestDeleteEvent(ev.row)}
                                      >
                                        Delete
                                      </button>
                                    </div>
                                  </details>
                                </div>
                              )}
                              {!canManageCourseEvents && canJoinCourseEvents && (
                                <div className="course-detail-event-actions">
                                  <button
                                    type="button"
                                    className="course-detail-btn course-detail-btn--small"
                                    onClick={() => handleJoinEventById(ev.row.appointment_id)}
                                    disabled={
                                      Number(ev.row.joined_by_viewer || 0) > 0
                                      || Number(ev.row.attendee_count || 0) >= Number(ev.row.capacity || 1)
                                    }
                                  >
                                    {Number(ev.row.joined_by_viewer || 0) > 0
                                      ? 'Joined'
                                      : Number(ev.row.attendee_count || 0) >= Number(ev.row.capacity || 1)
                                        ? 'Full'
                                        : 'Join'}
                                  </button>
                                </div>
                              )}
                            </li>
                          );
                        })}
                      </ul>
                    )}
                  </div>
                </div>
              </div>
            )}

            {inviteModalOpen && inviteHref && (
              <InviteURLModal
                ownerEmail={user.mcgill_email || ''}
                eventTitle={course?.course_name || course?.course_code || 'Course'}
                inviteURL={inviteHref}
                title="Share course invitation link"
                description="Share this link so students can join the course."
                contextLabel="Course"
                tip="Tip: post this in your class announcements."
                onClose={() => setInviteModalOpen(false)}
              />
            )}
            {confirmDeleteEvent && (
              <ConfirmActionModal
                title="Delete this event?"
                message="This will cancel the event and remove it from active course scheduling."
                details={[
                  { label: 'Event', value: confirmDeleteEvent.ap_title || 'Appointment' },
                  { label: 'When', value: formatRange(confirmDeleteEvent.start_time, confirmDeleteEvent.end_time) },
                ]}
                confirmLabel="Delete event"
                cancelLabel="Keep event"
                danger
                onConfirm={async () => {
                  const targetId = confirmDeleteEvent.appointment_id;
                  setConfirmDeleteEvent(null);
                  await handleDeleteEventById(targetId);
                }}
                onClose={() => setConfirmDeleteEvent(null)}
              />
            )}

            {actionError ? <p className="course-detail-error course-detail-error--banner">{actionError}</p> : null}
          </section>
        </div>
      </div>

      {userId != null && (
        <ExportCalendarModal
          open={exportCalendarOpen}
          onClose={() => setExportCalendarOpen(false)}
          userId={Number(userId)}
          isFaculty={isFacultyAdmin(user.user_type)}
          exportSource="course"
          courseAppointmentRows={detail?.appointments || []}
          downloadFileBaseName={courseExportFileName}
        />
      )}
    </div>
  );
}
