/*AMANDA TRAN*/
// React state/effect hooks plus router helpers for route-based heatmap pages.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// Shared heatmap styling for the setup panel, tabs, grids, and modals.
import '../styles/Heatmap.css';
// Shared page chrome and session helpers.
import logo from '../assets/LGTMLogo2.png';
import Navbar from '../components/Navbar';
import AppSidebar from '../components/AppSidebar';
import useAppShellSession from '../hooks/useAppShellSession';
import { sessionUserToNavUser } from '../auth/authUtils';
import { PAGE_HELP_GUIDES } from '../data/helpGuides';
// Grid components used by professor view: personal availability and group heatmap.
import { PersonalGrid, GroupGrid, HeatmapLegend, GridPager } from '../components/HeatmapGrid';
// Reusable modal components for confirmations, sharing, and appointment details.
import {
  ConfirmActionModal,
  ConfirmSlotModal,
  DeleteConfirmModal,
  InviteURLModal,
  SlotDetailModal,
} from '../components/Modals';
// Backend helpers for loading, saving, editing, deleting, and booking from heatmaps.
import {
  createHeatmap,
  createHeatmapAppointment,
  deleteHeatmap,
  getHeatmap,
  saveHeatmapSubmission,
  updateHeatmap,
} from '../api/heatmaps';
import { getCourses } from '../api/courses';
import { logout } from '../api/auth';
// Calendar-grid helpers that produce the visible day and time labels.
import { generateDays, generateTimes } from '../utils/generateDays';
// Shared conversion helpers used by both professor and student heatmap pages.
import {
  PARTICIPANT_COLORS,
  addDaysToIsoDate,
  buildDashboardPath,
  buildHeatmapPath,
  compareIsoDates,
  countInclusiveDays,
  deriveRangeFromSlots,
  expandRecurring,
  keyToDateRange,
  keysToSlots,
  mapSubmissionSlotsToKeys,
  maxIsoDate,
  minIsoDate,
  toLocalIsoDate,
  toLocalDateTime,
} from '../utils/heatmapPageUtils';

const GRID_PAGE_SIZE = 5;

function getDefaultHeatmapRange() {
  const today = toLocalIsoDate(new Date());

  return {
    startDate: today,
    endDate: addDaysToIsoDate(today, GRID_PAGE_SIZE - 1),
  };
}

export default function ProfessorHeatmap() {
  // Router data: eventId is either "new" or the heatmap ID from the URL.
  const navigate = useNavigate();
  const { eventId } = useParams();
  // Session data is converted into the smaller shape this page needs.
  const { user: sessionUser } = useAppShellSession();
  const sessionNav = useMemo(() => sessionUserToNavUser(sessionUser), [sessionUser]);
  const isNewHeatmapRoute = eventId === 'new';

  // Local user object used for nav display and backend write actions.
  const user = useMemo(() => {
    if (!sessionUser) return null;
    return {
      id: sessionUser.user_id,
      name: sessionNav?.name || '',
      email: sessionUser.mcgill_email,
      role: sessionNav?.role || 'professor',
    };
  }, [sessionUser, sessionNav]);

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '';

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  }

  // Controls which dates and hours are visible in the heatmap grid.
  const defaultRange = useMemo(() => getDefaultHeatmapRange(), []);
  const [startDate, setStartDate] = useState(defaultRange.startDate);
  const [endDate, setEndDate] = useState(defaultRange.endDate);
  const [viewStartDate, setViewStartDate] = useState(defaultRange.startDate);
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);
  const [setupDone, setSetupDone] = useState(false);
  const visibleDayCount = useMemo(
    () => Math.min(GRID_PAGE_SIZE, countInclusiveDays(viewStartDate, endDate)),
    [viewStartDate, endDate]
  );
  const days = useMemo(() => generateDays(viewStartDate, visibleDayCount), [viewStartDate, visibleDayCount]);
  const times = useMemo(() => generateTimes(startHour, endHour), [startHour, endHour]);
  const latestPageStart = useMemo(
    () => maxIsoDate(startDate, addDaysToIsoDate(endDate, -(GRID_PAGE_SIZE - 1))),
    [startDate, endDate]
  );
  const canPageBack = compareIsoDates(viewStartDate, startDate) > 0;
  const canPageForward = compareIsoDates(days[days.length - 1]?.iso || viewStartDate, endDate) < 0;
  const gridRangeLabel = days.length > 0
    ? `${days[0].date} - ${days[days.length - 1].date}`
    : '';

  // Professor availability state and recurrence options.
  const [profSelected, setProfSelected] = useState(new Set());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  // UI state: active tab, active group selection, and modals.
  const [tab, setTab] = useState('personal');
  const [activeNames, setActive] = useState(new Set());
  const [groupKeys, setGroupKeys] = useState(new Set());
  const [groupMetaByKey, setGroupMetaByKey] = useState({});
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);
  // Loaded heatmap bundle and basic page status.
  const [heatmapBundle, setHeatmapBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // Metadata form shown before a brand-new heatmap is created.
  const [newHeatmapTitle, setNewHeatmapTitle] = useState('');
  const [newHeatmapDescription, setNewHeatmapDescription] = useState('');
  const [newHeatmapCourseId, setNewHeatmapCourseId] = useState('');
  const [creatingHeatmap, setCreatingHeatmap] = useState(false);
  // Existing heatmap details can be edited after creation without changing the availability grid.
  const [isEditingHeatmapDetails, setIsEditingHeatmapDetails] = useState(false);
  const [editHeatmapTitle, setEditHeatmapTitle] = useState('');
  const [editHeatmapDescription, setEditHeatmapDescription] = useState('');
  const [editHeatmapCourseId, setEditHeatmapCourseId] = useState('');
  const [savingHeatmapDetails, setSavingHeatmapDetails] = useState(false);
  const [deletingHeatmap, setDeletingHeatmap] = useState(false);
  const [ownedCourses, setOwnedCourses] = useState([]);

  // Pull apart the bundle so render logic can stay readable below.
  const heatmap = heatmapBundle?.heatmap;
  const loadedHeatmapId = heatmap?.id;
  const loadedHeatmapTitle = heatmap?.title;
  const loadedHeatmapDescription = heatmap?.description;
  const loadedHeatmapCourseId = heatmap?.courseId;
  const allSubmissions = useMemo(() => heatmapBundle?.submissions || [], [heatmapBundle]);
  const currentHeatmapId = loadedHeatmapId || (isNewHeatmapRoute ? null : Number(eventId));
  const hostSubmission = allSubmissions.find((submission) => submission.participantRole === 'host') || null;
  const participantSubmissions = useMemo(
    () => allSubmissions.filter((submission) => submission.participantRole !== 'host'),
    [allSubmissions]
  );
  // Group heatmap participants include each student's name, color, status, and selected slot keys.
  const participants = useMemo(
    () =>
      participantSubmissions.map((submission, index) => ({
        submissionId: submission.id,
        userId: submission.userId,
        name: submission.userName,
        color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length],
        status: submission.status,
        slots: Array.from(mapSubmissionSlotsToKeys(submission, startHour, endHour)),
      })),
    [participantSubmissions, startHour, endHour]
  );

  // Load an existing heatmap. The /new route shows a title/description form before creation.
  useEffect(() => {
    let active = true;

    async function loadHeatmapData() {
      setLoading(true);
      setError('');

      try {
        if (isNewHeatmapRoute) {
          if (active) {
            setHeatmapBundle(null);
            setLoading(false);
          }
          return;
        }

        const bundle = await getHeatmap(eventId);
        if (!active) return;

        setHeatmapBundle(bundle);

        // Existing heatmaps may have saved slots, so fit the grid to those slots automatically.
        const allSlots = bundle.submissions.flatMap((submission) => submission.slots);
        const derivedRange = deriveRangeFromSlots(allSlots);
        if (derivedRange) {
          setStartDate(derivedRange.startDate);
          setEndDate(derivedRange.endDate);
          setViewStartDate(derivedRange.startDate);
          setStartHour(derivedRange.startHour);
          setEndHour(Math.max(derivedRange.endHour, derivedRange.startHour + 1));
          setSetupDone(true);
        }
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load heatmap.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadHeatmapData();
    return () => {
      active = false;
    };
  }, [eventId, isNewHeatmapRoute, navigate, user?.id]);

  // Load courses for which this professor is an owner so the form can show course codes.
  useEffect(() => {
    let active = true;

    if (!user?.id) {
      setOwnedCourses([]);
      return () => {
        active = false;
      };
    }

    getCourses()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.courses) ? data.courses : [];
        const ownerOnly = list.filter((course) => {
          if (course?.is_owner != null) return Boolean(course.is_owner);
          if (course?.owner_user_id != null) return Number(course.owner_user_id) === Number(user.id);
          return true;
        });
        setOwnedCourses(ownerOnly);
      })
      .catch(() => {
        if (!active) return;
        setOwnedCourses([]);
      });

    return () => {
      active = false;
    };
  }, [user?.id]);

  // When a heatmap loads or changes, seed the edit form with the saved details.
  useEffect(() => {
    if (!loadedHeatmapId) return;

    setEditHeatmapTitle(loadedHeatmapTitle || '');
    setEditHeatmapDescription(loadedHeatmapDescription || '');
    setEditHeatmapCourseId(loadedHeatmapCourseId ? String(loadedHeatmapCourseId) : '');
    setIsEditingHeatmapDetails(false);
  }, [loadedHeatmapId, loadedHeatmapTitle, loadedHeatmapDescription, loadedHeatmapCourseId]);

  // Apply the full heatmap date range and reset the grid window to the first page.
  function handleApplyDateRange() {
    if (compareIsoDates(endDate, startDate) < 0) {
      setError('End date must be on or after the start date.');
      return;
    }

    setError('');
    setViewStartDate(startDate);
    setSetupDone(true);
  }

  // Move the visible grid window backward through the selected date range.
  function showPreviousDays() {
    setViewStartDate((current) => maxIsoDate(startDate, addDaysToIsoDate(current, -GRID_PAGE_SIZE)));
  }

  // Move the visible grid window forward through the selected date range.
  function showNextDays() {
    setViewStartDate((current) => minIsoDate(addDaysToIsoDate(current, GRID_PAGE_SIZE), latestPageStart));
  }

  // Create the heatmap only after the professor confirms the title and description.
  async function handleCreateHeatmap(event) {
    event.preventDefault();
    if (!user?.id || creatingHeatmap) return;

    const title = newHeatmapTitle.trim();
    const description = newHeatmapDescription.trim();
    const courseId = newHeatmapCourseId.trim();

    if (!title) {
      setError('Please enter a heatmap title.');
      return;
    }

    try {
      setCreatingHeatmap(true);
      setError('');

      const bundle = await createHeatmap({
        created_by: user.id,
        hm_title: title,
        course_id: courseId || null,
        hm_description: description || null,
        visibility: 'public',
        time_zone: 'America/Toronto',
      });

      navigate(buildHeatmapPath('professor', bundle.heatmap.id), { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to create heatmap.');
    } finally {
      setCreatingHeatmap(false);
    }
  }

  // Save title/description edits for the current professor-owned heatmap.
  async function handleSaveHeatmapDetails(event) {
    event.preventDefault();
    if (!user?.id || !currentHeatmapId || savingHeatmapDetails) return;

    const title = editHeatmapTitle.trim();
    const description = editHeatmapDescription.trim();
    const courseId = editHeatmapCourseId.trim();

    if (!title) {
      setError('Please enter a heatmap title.');
      return;
    }

    try {
      setSavingHeatmapDetails(true);
      setError('');

      const bundle = await updateHeatmap(currentHeatmapId, {
        hm_title: title,
        course_id: courseId || null,
        hm_description: description || null,
        changed_by: user.id,
      });

      setHeatmapBundle(bundle);
      setIsEditingHeatmapDetails(false);
    } catch (err) {
      setError(err.message || 'Unable to update heatmap details.');
    } finally {
      setSavingHeatmapDetails(false);
    }
  }

  // Delete removes the heatmap and its submitted availability, then returns to the dashboard.
  async function handleDeleteHeatmap() {
    if (!user?.id || !currentHeatmapId || deletingHeatmap) return;

    try {
      setDeletingHeatmap(true);
      setError('');

      await deleteHeatmap(currentHeatmapId, user.id);
      setHeatmapBundle(null);
      setModal(null);
      navigate('/dashboard/professor', { replace: true });
    } catch (err) {
      setError(err.message || 'Unable to delete heatmap.');
      setModal(null);
    } finally {
      setDeletingHeatmap(false);
    }
  }

  // When submissions change, default the group heatmap to showing every participant.
  useEffect(() => {
    if (participants.length > 0) {
      setActive(new Set(participants.map((participant) => participant.name)));
    } else {
      setActive(new Set());
    }
  }, [participants]);

  // Keep the professor's personal grid synced with the saved host submission.
  useEffect(() => {
    if (!hostSubmission) {
      setProfSelected(new Set());
      return;
    }

    const hostKeys = mapSubmissionSlotsToKeys(hostSubmission, startHour, endHour);
    setProfSelected(new Set(hostKeys));
  }, [hostSubmission, startHour, endHour]);

  // Save the professor's selected slots, expanding them first if recurring weeks are enabled.
  async function saveProfAvailability() {
    if (!user?.id) return;
    const savedKeys = isRecurring ? expandRecurring(profSelected, recurringWeeks) : new Set(profSelected);

    try {
      const bundle = await saveHeatmapSubmission(currentHeatmapId, {
        user_id: user.id,
        participant_role: 'host',
        status: 'approved',
        slots: keysToSlots(savedKeys, startHour),
      });

      setHeatmapBundle(bundle);
      alert(
        isRecurring
          ? `${profSelected.size} slots saved and repeated for ${recurringWeeks} week(s).`
          : `${profSelected.size} slots saved for this week only.`
      );
    } catch (err) {
      setError(err.message || 'Unable to save professor availability.');
    }
  }

  // Confirming a group slot creates one appointment with everyone free in that selected cell.
  async function handleConfirmSlot() {
    try {
      const selectedMetas = Array.from(groupKeys)
        .map((key) => ({ key, meta: groupMetaByKey[key] }))
        .filter(({ meta }) => meta?.who?.length > 0);

      if (selectedMetas.length === 0) {
        setError('Select at least one group slot with available students.');
        return;
      }

      let latestResponse = null;

      for (const { key, meta } of selectedMetas) {
        const startEnd = keyToDateRange(key, startHour);
        latestResponse = await createHeatmapAppointment(currentHeatmapId, {
          host_user_id: heatmap.createdBy,
          attendee_user_ids: meta.who.map((participant) => participant.userId),
          start_time: toLocalDateTime(startEnd.start),
          end_time: toLocalDateTime(startEnd.end),
          ap_title: selectedMetas.length > 1 ? 'Group heatmap booking series' : 'Group heatmap booking',
          ap_description: 'Created from heatmap group confirmation',
          location: 'Heatmap group booking',
          changed_by: user?.id || heatmap.createdBy,
          approved_submission_ids: meta.who
            .filter((participant) => participant.status === 'pending')
            .map((participant) => participant.submissionId)
            .filter(Boolean),
        });
      }

      setHeatmapBundle(latestResponse.heatmap);
      setGroupKeys(new Set());
      setGroupMetaByKey({});
      setModal(null);
      navigate('/dashboard/professor');
    } catch (err) {
      setError(err.message || 'Unable to confirm group booking.');
    }
  }

  return (
    <div className="dashboard-page">
      <Navbar
        logo={logo}
        title="Heatmap"
        user={user ? { displayName: user.name, role: user.role, initials: userInitials } : undefined}
        onLeftClick={() => navigate(buildDashboardPath(user))}
        actions={[{ label: 'Log Out', onClick: handleLogout }]}
      />
      <div className="dashboard-layout">
        <AppSidebar
          activeId={null}
          user={sessionUser}
          navigate={navigate}
          canCreate={false}
          helpGuide={PAGE_HELP_GUIDES.professorHeatmap}
        />
        <div className="heatmap-main-content">
          <div className="heatmap-page" style={{ width: '100%' }}>
        {isNewHeatmapRoute ? (
          <>
            <div className="page-header">
              <div className="page-label">New heatmap</div>
              <h1 className="page-title">Create heatmap appointment</h1>
              <p className="page-subtitle">
                Add a title and description before choosing the availability times students can respond to.
              </p>
            </div>

            {error && <p style={{ color: '#cc2222', marginBottom: 16 }}>{error}</p>}

            <form className="heatmap-create-card" onSubmit={handleCreateHeatmap}>
              <div className="heatmap-create-copy">
                <h3>Appointment details</h3>
                <p>
                  Students will see this title and description when they open the heatmap link.
                  Keep it specific so they know what meeting or office-hour block they are responding to.
                </p>
              </div>

              <div className="heatmap-create-fields">
                <label>
                  <span>Heatmap appointment title</span>
                  <input
                    type="text"
                    value={newHeatmapTitle}
                    onChange={(e) => setNewHeatmapTitle(e.target.value)}
                    placeholder="e.g.:COMP 307 project check-ins"
                    maxLength={120}
                  />
                </label>

                <label>
                  <span>Course code</span>
                  <select
                    value={newHeatmapCourseId}
                    onChange={(e) => setNewHeatmapCourseId(e.target.value)}
                  >
                    <option value="">Optional</option>
                    {ownedCourses.map((course) => (
                      <option key={course.course_id} value={String(course.course_id)}>
                        {course.course_code}
                        {course.course_name ? ` - ${course.course_name}` : ''}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Description</span>
                  <textarea
                    value={newHeatmapDescription}
                    onChange={(e) => setNewHeatmapDescription(e.target.value)}
                    placeholder="e.g.: Pick every time you could attend a 30-minute project meeting this week."
                    rows={5}
                    maxLength={500}
                  />
                </label>
              </div>

              <div className="confirm-bar">
                <button className="button button-primary" type="submit" disabled={creatingHeatmap}>
                  {creatingHeatmap ? 'Creating...' : 'Create heatmap'}
                </button>
                <button className="button button-outline" type="button" onClick={() => navigate('/dashboard/professor')}>
                  Cancel
                </button>
              </div>
            </form>
          </>
        ) : (
          <>
        {/* Page intro explains what the professor is doing on this screen. */}
        <div className="page-header">
          <div className="page-label">Professor Dashboard</div>
          <h1 className="page-title">Set your availability</h1>
          <p className="page-subtitle">Mark when you're free. Choose whether slots repeat weekly.</p>
        </div>

        {/* Lightweight page feedback while data loads or if a backend call fails. */}
        {loading && <p style={{ color: '#666', marginBottom: 16 }}>Loading heatmap...</p>}
        {error && <p style={{ color: '#cc2222', marginBottom: 16 }}>{error}</p>}

        {/* Professor-owned heatmap metadata can be renamed or removed from this control card. */}
        {heatmap && (
          <div className="heatmap-details-card">
            {isEditingHeatmapDetails ? (
              <form className="heatmap-details-form" onSubmit={handleSaveHeatmapDetails}>
                <div className="heatmap-details-copy">
                  <span>Heatmap appointment</span>
                  <h3>Edit title and description</h3>
                  <p>
                    These details are shown to students when they open the invite link.
                  </p>
                </div>

                <div className="heatmap-create-fields">
                  <label>
                    <span>Heatmap appointment title</span>
                    <input
                      type="text"
                      value={editHeatmapTitle}
                      onChange={(e) => setEditHeatmapTitle(e.target.value)}
                      placeholder="e.g.:COMP 307 project check-ins"
                      maxLength={120}
                    />
                  </label>

                  <label>
                    <span>Course code</span>
                    <select
                      value={editHeatmapCourseId}
                      onChange={(e) => setEditHeatmapCourseId(e.target.value)}
                    >
                      <option value="">Optional</option>
                      {ownedCourses.map((course) => (
                        <option key={course.course_id} value={String(course.course_id)}>
                          {course.course_code}
                          {course.course_name ? ` - ${course.course_name}` : ''}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label>
                    <span>Description</span>
                    <textarea
                      value={editHeatmapDescription}
                      onChange={(e) => setEditHeatmapDescription(e.target.value)}
                      placeholder="e.g.:Pick every time you could attend a 30-minute project meeting this week."
                      rows={4}
                      maxLength={500}
                    />
                  </label>
                </div>

                <div className="heatmap-details-actions">
                  <button className="button button-primary" type="submit" disabled={savingHeatmapDetails}>
                    {savingHeatmapDetails ? 'Saving...' : 'Save details'}
                  </button>
                  <button
                    className="button button-outline"
                    type="button"
                    onClick={() => {
                      setEditHeatmapTitle(heatmap.title || '');
                      setEditHeatmapDescription(heatmap.description || '');
                      setEditHeatmapCourseId(heatmap.courseId ? String(heatmap.courseId) : '');
                      setIsEditingHeatmapDetails(false);
                    }}
                    disabled={savingHeatmapDetails}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            ) : (
              <>
                <div className="heatmap-details-copy">
                  <span>Heatmap appointment</span>
                  <h3>{heatmap.title || 'Untitled heatmap'}</h3>
                  <p>{heatmap.description || 'No description added yet.'}</p>
                  {heatmap.courseId && (
                    <p>Course: {heatmap.courseCode || `#${heatmap.courseId}`}{heatmap.courseName ? ` - ${heatmap.courseName}` : ''}</p>
                  )}
                </div>

                <div className="heatmap-details-actions">
                  <button className="button button-outline" onClick={() => setIsEditingHeatmapDetails(true)}>
                    Edit details
                  </button>
                  <button className="button button-danger" onClick={() => setModal('deleteHeatmap')}>
                    Delete heatmap
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Top mode cards switch between professor availability and the group heatmap. */}
        <div className="mode-cards mode-cards-two">
          <div className={`mode-card${tab === 'personal' ? ' active' : ''}`} onClick={() => setTab('personal')}>
            <div className="mode-card-icon professor"></div>
            <h4>My availability</h4>
            <p>Click and drag to mark times you're free. Set recurring or one-time.</p>
          </div>

          <div className={`mode-card${tab === 'group' ? ' active' : ''}`} onClick={() => setTab('group')}>
            <div className="mode-card-icon professor">🌡️</div>
            <h4>Availability heatmap</h4>
            <p>See all students' availability at once. Darker cells = more students free.</p>
          </div>
        </div>

        {/* First-time setup controls for choosing the visible week and hours. */}
        {!setupDone && (
          <div className="setup-banner">
            <div className="setup-banner-left">
              <h3>Set the date range</h3>
              <p>Choose which week and hours to display on the grid.</p>
            </div>
            <div className="setup-controls">
              <div className="setup-field">
                <label>Start date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => {
                    const nextStart = e.target.value;
                    setStartDate(nextStart);
                    if (compareIsoDates(endDate, nextStart) < 0) {
                      setEndDate(nextStart);
                    }
                  }}
                />
              </div>
              <div className="setup-field">
                <label>End date</label>
                <input
                  type="date"
                  value={endDate}
                  min={startDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
              <div className="setup-field">
                <label>From</label>
                <select value={startHour} onChange={(e) => setStartHour(Number(e.target.value))}>
                  {[6, 7, 8, 9, 10, 11, 12].map((h) => (
                    <option key={h} value={h}>{h <= 12 ? h : h - 12}:00 {h < 12 ? 'AM' : 'PM'}</option>
                  ))}
                </select>
              </div>
              <div className="setup-field">
                <label>To</label>
                <select value={endHour} onChange={(e) => setEndHour(Number(e.target.value))}>
                  {[13, 14, 15, 16, 17, 18, 19, 20, 21].map((h) => (
                    <option key={h} value={h}>{h <= 12 ? h : h - 12}:00 {h < 12 ? 'AM' : 'PM'}</option>
                  ))}
                </select>
              </div>
              <button className="button button-primary" style={{ alignSelf: 'flex-end' }} onClick={handleApplyDateRange}>
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Compact summary after setup is applied, with a button to edit the range again. */}
        {setupDone && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text)' }}>{days[0]?.date} – {days[days.length - 1]?.date}</strong> of {countInclusiveDays(startDate, endDate)} days, {startHour <= 12 ? startHour : startHour - 12}:00 {startHour < 12 ? 'AM' : 'PM'} {' – '} {endHour <= 12 ? endHour : endHour - 12}:00 {endHour < 12 ? 'AM' : 'PM'}
            </span>
            <button className="button button-ghost button-small" onClick={() => setSetupDone(false)}>
              Change
            </button>
          </div>
        )}

        {/* Personal tab: professor selects and saves their own available time slots. */}
        {tab === 'personal' && (
          <>
            <p className="section-label">Click or drag to mark when you're free</p>
            <div className="grid-outer">
              <GridPager
                rangeLabel={gridRangeLabel}
                canGoBack={canPageBack}
                canGoForward={canPageForward}
                onPrev={showPreviousDays}
                onNext={showNextDays}
              >
                <PersonalGrid days={days} times={times} selected={profSelected} setSelected={setProfSelected} />
              </GridPager>
            </div>

            {/* Recurrence controls decide whether selected slots apply once or repeat weekly. */}
            <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="recurrence" checked={!isRecurring} onChange={() => setIsRecurring(false)} style={{ accentColor: 'var(--red)', width: 16, height: 16 }} />
                <span>
                  <strong>One-time only</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                    — visible for {startDate} – {endDate}
                  </span>
                </span>
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="recurrence" checked={isRecurring} onChange={() => setIsRecurring(true)} style={{ accentColor: 'var(--red)', width: 16, height: 16 }} />
                <span>
                  <strong>Recurring</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— repeat for</span>
                </span>
              </label>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={recurringWeeks}
                  onChange={(e) => setRecurringWeeks(Number(e.target.value))}
                  disabled={!isRecurring}
                  style={{ padding: '5px 10px', borderRadius: 6, border: '1.5px solid var(--border-med)', background: isRecurring ? '#fff' : 'var(--surface2)', color: isRecurring ? 'var(--text)' : 'var(--text-faint)', fontSize: 13, cursor: isRecurring ? 'pointer' : 'default', fontFamily: 'inherit' }}
                >
                  {[2, 3, 4, 5, 6, 8, 10, 12].map((w) => (
                    <option key={w} value={w}>{w} weeks</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Save/share controls for the professor's selected slots. */}
            <div className="confirm-bar">
              <button className="button button-primary" onClick={saveProfAvailability}>
                {isRecurring ? `Save & repeat for ${recurringWeeks} weeks` : 'Save for this week'}
              </button>
              <button className="button button-outline" onClick={() => setProfSelected(new Set())}>
                Clear all
              </button>
              <button className="button button-outline" onClick={() => setModal('invite')}>
                Share invite link
              </button>
              <span className="selected-info">
                <strong>{profSelected.size}</strong> slot{profSelected.size !== 1 ? 's' : ''} selected
              </span>
            </div>
          </>
        )}

        {/* Group tab: professor sees all student availability as one combined heatmap. */}
        {tab === 'group' && (
          <>
            <p className="section-label">All respondents ({participants.length})</p>
            {participants.length === 0 ? (
              <div className="empty-state">
                <h4>No student availability yet</h4>
                <p>Once students share their availability, you'll see it here. Darker cells mean more students are free at that time.</p>
              </div>
            ) : (
              <>
                <div className="participants">
                  {participants.map((participant) => (
                    // Clicking a chip toggles whether that student is included in the group heatmap.
                    <div
                      key={participant.name}
                      className={`participant-chip${activeNames.has(participant.name) ? ' active' : ' inactive'}`}
                      onClick={() => {
                        setActive((prev) => {
                          const next = new Set(prev);
                          next.has(participant.name) ? next.delete(participant.name) : next.add(participant.name);
                          return next;
                        });
                      }}
                    >
                      <span className="participant-chip-dot" style={{ background: participant.color }} />
                      {participant.name}
                    </div>
                  ))}
                </div>
                <HeatmapLegend max={participants.filter((participant) => activeNames.has(participant.name)).length} />
                <p className="section-label">Hover a cell to see who's free — click to select a booking slot</p>
                <div className="grid-outer">
                  <GridPager
                    rangeLabel={gridRangeLabel}
                    canGoBack={canPageBack}
                    canGoForward={canPageForward}
                    onPrev={showPreviousDays}
                    onNext={showNextDays}
                  >
                    {/* Selecting a group cell stores the slot and participant metadata for confirmation. */}
                    <GroupGrid
                      days={days}
                      times={times}
                      participants={participants}
                      activeNames={activeNames}
                      selectedKeys={groupKeys}
                      setSelectedKeys={setGroupKeys}
                      onSelectKey={(key, meta) => {
                        setGroupMetaByKey((prev) => ({ ...prev, [key]: meta }));
                      }}
                    />
                  </GridPager>
                </div>
                <div className="confirm-bar">
                  <button className="button button-primary" onClick={() => setModal('confirm')} disabled={groupKeys.size === 0}>
                    Confirm selected slot{groupKeys.size !== 1 ? 's' : ''}
                  </button>
                  <button className="button button-outline" onClick={() => { setGroupKeys(new Set()); setGroupMetaByKey({}); }}>
                    Clear selected
                  </button>
                  <span className="selected-info">
                    {groupKeys.size > 0
                      ? <><strong>{groupKeys.size}</strong> slot{groupKeys.size !== 1 ? 's' : ''} selected. Drag across cells to select more.</>
                      : 'Click or drag cells to select one or more group booking slots'}
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* Modal for confirming one group booking slot. */}
        {modal === 'confirm' && groupKeys.size > 0 && (
          <ConfirmSlotModal
            slot={{
              day: { date: `${groupKeys.size} selected slots`, short: 'Group' },
              timeLabel: 'Multiple time slots',
            }}
            attendees={Array.from(new Map(
              Array.from(groupKeys)
                .flatMap((key) => groupMetaByKey[key]?.who || [])
                .map((participant) => [participant.userId, participant])
            ).values())}
            onConfirm={handleConfirmSlot}
            onClose={() => setModal(null)}
          />
        )}

        {/* Appointment detail modal, kept here for consistency with other calendar pages. */}
        {modal === 'detail' && activeAppt && (
          <SlotDetailModal appointment={activeAppt} isOwner onDelete={() => setModal('delete')} onClose={() => setModal(null)} />
        )}

        {/* Delete confirmation modal for appointment detail flow. */}
        {modal === 'delete' && activeAppt && (
          <DeleteConfirmModal
            appointment={{ ...activeAppt, notifyEmail: activeAppt.ownerEmail }}
            onConfirm={() => setActiveAppt(null)}
            onClose={() => setModal('detail')}
          />
        )}

        {/* Shareable student invite link for this heatmap. */}
        {modal === 'invite' && (
          <InviteURLModal
            ownerEmail={heatmap?.hostEmail || user.email}
            eventTitle={heatmap?.title || 'Heatmap Booking'}
            inviteURL={`${window.location.origin}/heatmap/student/${currentHeatmapId}`}
            title="Share your booking page"
            description="Share this link so students can open the heatmap, mark their availability, and send it back to you."
            contextLabel="Booking page for"
            tip="Tip: paste this into your course slides or email signature."
            onClose={() => setModal(null)}
          />
        )}

        {/* Branded confirmation before removing this heatmap and its availability submissions. */}
        {modal === 'deleteHeatmap' && (
          <ConfirmActionModal
            title="Delete this heatmap?"
            message="This will remove the heatmap link and all availability submissions connected to it. Existing appointments already created from the heatmap will stay on the dashboard."
            details={[
              { label: 'Heatmap', value: heatmap?.title || 'Untitled heatmap' },
              { label: 'Submissions', value: `${participantSubmissions.length} student response${participantSubmissions.length !== 1 ? 's' : ''}` },
            ]}
            confirmLabel="Delete heatmap"
            danger
            isWorking={deletingHeatmap}
            onConfirm={handleDeleteHeatmap}
            onClose={() => setModal(null)}
          />
        )}

          </>
        )}
          </div>
        </div>
      </div>
    </div>
  );
}
