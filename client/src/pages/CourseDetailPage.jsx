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
import { createAvailability, deleteAvailability } from '../api/availabilities';
import { logout } from '../api/auth';
import Navbar from '../components/Navbar';
import Sidebar from '../components/Sidebar';
import CreateAvailabilityModal from '../components/CreateAvailabilityModal';
import CourseSettingsModal from '../components/CourseSettingsModal';
import { InviteURLModal } from '../components/Modals';
import logo from '../assets/logo1.png';
import calendarIcon from '../assets/calendarIcon.png';
import coursesIcon from '../assets/courseIcon.png';
import searchIcon from '../assets/searchIcon.png';
import InfoIcon from '../assets/infoIcon.png';
import '../styles/Dashboard.css';
import '../styles/CourseDetailPage.css';

function formatRange(startIso, endIso) {
  if (!startIso) return '';
  const start = new Date(startIso);
  const end = endIso ? new Date(endIso) : null;
  const opts = { dateStyle: 'medium', timeStyle: 'short' };
  if (end && !Number.isNaN(end.getTime())) {
    return `${start.toLocaleString(undefined, opts)} – ${end.toLocaleString(undefined, opts)}`;
  }
  return start.toLocaleString(undefined, opts);
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
  (detail.office_hours || []).forEach((row) => {
    out.push({ kind: 'availability', row, start: row.start_time });
  });
  (detail.appointments || []).forEach((row) => {
    out.push({ kind: 'appointment', row, start: row.start_time });
  });
  out.sort((a, b) => String(a.start).localeCompare(String(b.start)));
  return out;
}

function eventAccentClass(title, kind) {
  const t = (title || '').toLowerCase();
  if (t.includes('office') || t.includes(' oh') || /\boh\b/.test(t)) return 'course-detail-event--accent-green';
  if (t.includes('tutorial')) return 'course-detail-event--accent-purple';
  if (t.includes('lecture')) return 'course-detail-event--accent-blue';
  if (kind === 'appointment') return 'course-detail-event--accent-purple';
  return 'course-detail-event--accent-blue';
}

function formatEventCreatorName(row) {
  if (!row) return '';
  const fn = row.creator_first_name;
  const ln = row.creator_last_name;
  const parts = [fn, ln].filter(Boolean);
  return parts.length ? parts.join(' ') : '';
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
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [createEventOpen, setCreateEventOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);

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

  const course = detail?.course;
  const showInviteSection = Boolean(detail && (course?.is_owner) && inviteHref);
  const showOwnerTools = Boolean(course?.is_owner);
  /** Owners or course admins (assigned staff) may add/delete course calendar events. */
  const canManageCourseEvents = Boolean(course?.is_owner || course?.is_staff);
  const currentUserId = userId != null ? String(userId) : '';
  const semesterLabel = course ? `${course.course_term} ${course.course_year}` : '';

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
        { id: 'calendar', icon: calendarIcon, label: 'Calendar', onClick: () => navigate('/dashboard/professor?tab=calendar') },
        { id: 'courses', icon: coursesIcon, label: 'Courses', onClick: () => navigate('/courses') },
        { id: 'search', icon: searchIcon, label: 'Search', onClick: () => navigate('/booking/search') },
      ];
      if (detail?.course?.is_owner || detail?.course?.is_staff) {
        items.push({
          id: 'create',
          iconText: '+',
          label: 'Create',
          onClick: () => setCreateEventOpen(true),
        });
      }
      return items;
    },
    [navigate, detail?.course?.is_owner, detail?.course?.is_staff]
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
    await createAvailability({
      created_by: Number(userId),
      course_id: courseId,
      ...payload,
    });
    setCreateEventOpen(false);
    await loadCourse();
  }

  async function handleDeleteAvailabilityBlock(avId) {
    setActionError('');
    try {
      await deleteAvailability(avId, userId);
      await loadCourse();
    } catch (err) {
      setActionError(err.message || 'Could not remove availability.');
    }
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

  function handleEventGear(ev) {
    if (!canManageCourseEvents) return;
    if (ev.kind === 'availability') {
      const id = ev.row.availability_id;
      if (!id) return;
      if (window.confirm('Delete this event?')) handleDeleteAvailabilityBlock(id);
    } else {
      navigate('/dashboard/professor');
    }
  }

  return (
    <div className="dashboard-page courses-list-page">
      <Navbar
        logo={logo}
        title="Course"
        onLeftClick={() => navigate('/')}
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
          onDeleteCourse={handleDeleteCourse}
          onAfterSettingsSave={loadCourse}
          deleting={deleting}
          onClose={() => setSettingsOpen(false)}
        />
      )}

      {createEventOpen && (
        <CreateAvailabilityModal
          defaultVisibility="public"
          onClose={() => setCreateEventOpen(false)}
          onSubmit={handleCreateCourseEvent}
        />
      )}

      <div className="dashboard-layout">
        <Sidebar
          activeId="courses"
          items={sidebarItems}
          bottomItems={[{ id: 'help', icon: InfoIcon, label: 'Help' }]}
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
                            {String(s.user_id) !== currentUserId && (
                              <Link className="course-detail-availability-pill" to={`/booking/professor/${s.user_id}`}>
                                Availability
                              </Link>
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
                    {eventsMerged.length === 0 ? (
                      <p className="course-detail-muted course-detail-events-empty">No events scheduled.</p>
                    ) : (
                      <ul className="course-detail-events-list">
                        {eventsMerged.map((ev) => {
                          const title =
                            ev.kind === 'availability'
                              ? ev.row.av_title || 'Availability'
                              : ev.row.ap_title || 'Appointment';
                          const accent = eventAccentClass(title, ev.kind);
                          const creatorName = formatEventCreatorName(ev.row);
                          return (
                            <li
                              key={
                                ev.kind === 'availability'
                                  ? `av-${ev.row.availability_id}`
                                  : `ap-${ev.row.appointment_id}`
                              }
                              className={`course-detail-event ${accent}`}
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
                                {creatorName ? (
                                  <div className="course-detail-event-creator">Created by {creatorName}</div>
                                ) : null}
                                {ev.kind === 'availability' && ev.row.av_description ? (
                                  <div className="course-detail-event-desc">{ev.row.av_description}</div>
                                ) : null}
                                {ev.kind === 'appointment' && ev.row.ap_description ? (
                                  <div className="course-detail-event-desc">{ev.row.ap_description}</div>
                                ) : null}
                              </div>
                              {canManageCourseEvents && (
                                <button
                                  type="button"
                                  className="course-detail-event-gear"
                                  onClick={() => handleEventGear(ev)}
                                  aria-label={ev.kind === 'availability' ? 'Delete or manage event' : 'Manage in dashboard'}
                                >
                                  <GearIcon />
                                </button>
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

            {actionError ? <p className="course-detail-error course-detail-error--banner">{actionError}</p> : null}
          </section>
        </div>
      </div>
    </div>
  );
}
