/*AMANDA TRAN*/
// Main React hooks plus router helpers for route-based heatmap pages.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import '../styles/Heatmap.css';
// Shared top nav and session helpers.
import logo from '../assets/logo1.png';
import Navbar from '../components/Navbar';
import useAppShellSession from '../hooks/useAppShellSession';
import { sessionUserToNavUser } from '../auth/authUtils';
// Different grid views depending on whether we are showing professor, student, or group mode.
import { PersonalGrid, ProfAvailGrid, GroupGrid, HeatmapLegend, makeKey } from '../components/HeatmapGrid';
// Reusable popups used for confirming, reviewing, and sharing heatmap actions.
import {
  ConfirmSlotModal,
  SlotDetailModal,
  DeleteConfirmModal,
  InviteURLModal,
  ApproveSubmissionModal,
} from '../components/Modals';
// Backend calls for creating, loading, saving, and approving heatmap data.
import { createHeatmap, createHeatmapAppointment, getHeatmap, saveHeatmapSubmission, updateHeatmapSubmissionStatus } from '../api/heatmaps';
// Small utilities that generate the visible days/hours for the grid.
import { generateDays, generateTimes } from '../utils/generateDays';

// Participant colors only matter in group mode, where each student gets a color.
const PARTICIPANT_COLORS = ['#E31429', '#c0842a', '#2a8c5f', '#5a4ab0', '#1565a8', '#cc4b37'];


// If the professor chooses recurring availability, this copies the same selected
// slots into future weeks by generating new grid keys for each 7-day jump.
function expandRecurring(selectedKeys, recurringWeeks) {
  const expanded = new Set(selectedKeys);
  selectedKeys.forEach((key) => {
    const [iso, ti] = key.split(':');
    for (let w = 1; w <= recurringWeeks; w += 1) {
      const d = new Date(iso);
      d.setDate(d.getDate() + w * 7);
      expanded.add(makeKey(toLocalIsoDate(d), ti));
    }
  });
  return expanded;
}

// SQLite sometimes stores date-times with a space, so this normalizes them into a JS-friendly format.
function parseSqliteDateTime(value) {
  return new Date(String(value).replace(' ', 'T'));
}

// Converts a JS Date into a local YYYY-MM-DD string, which is the format used by the grid keys.
function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Same idea as above, but keeps the time portion too.
function toLocalDateTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${toLocalIsoDate(date)}T${hours}:${minutes}:${seconds}`;
}

// Turns a real Date into a grid cell key like "2026-04-07:3" if it falls inside the visible range.
function buildGridKeyFromDate(date, startHour, endHour) {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const slotIndex = (hour - startHour) * 2 + (minute >= 30 ? 1 : 0);
  const totalSlots = (endHour - startHour) * 2;

  if (slotIndex < 0 || slotIndex >= totalSlots) return null;
  return makeKey(toLocalIsoDate(date), slotIndex);
}

// Converts selected grid keys back into real slot objects that can be sent to the backend.
function keysToSlots(keys, startHour) {
  return Array.from(keys).map((key) => {
    const [iso, timeIndexString] = key.split(':');
    const timeIndex = Number(timeIndexString);
    const start = new Date(`${iso}T00:00:00`);
    start.setHours(startHour + Math.floor(timeIndex / 2), timeIndex % 2 === 0 ? 0 : 30, 0, 0);
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    return {
      start_time: toLocalDateTime(start),
      end_time: toLocalDateTime(end),
    };
  });
}

// Used when a group slot is confirmed so we can turn the selected key back into real start/end times.
function keyToDateRange(key, startHour) {
  const [iso, timeIndexString] = key.split(':');
  const timeIndex = Number(timeIndexString);
  const start = new Date(`${iso}T00:00:00`);
  start.setHours(startHour + Math.floor(timeIndex / 2), timeIndex % 2 === 0 ? 0 : 30, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return { start, end };
}

// Looks at the saved slots and figures out the best visible date range for the current heatmap.
function deriveRangeFromSlots(slotRows) {
  if (!slotRows.length) return null;

  const starts = slotRows.map((slot) => parseSqliteDateTime(slot.startTime));
  const earliest = new Date(Math.min(...starts.map((d) => d.getTime())));
  const rangeStart = new Date(`${toLocalIsoDate(earliest)}T00:00:00`);
  const rangeEnd = new Date(rangeStart);
  rangeEnd.setDate(rangeEnd.getDate() + 6);

  const visibleSlots = slotRows.filter((slot) => {
    const start = parseSqliteDateTime(slot.startTime);
    return start >= rangeStart && start <= rangeEnd;
  });

  const visibleStarts = visibleSlots.map((slot) => parseSqliteDateTime(slot.startTime));
  const visibleEnds = visibleSlots.map((slot) => parseSqliteDateTime(slot.endTime));
  const latestVisible = new Date(Math.max(...visibleEnds.map((d) => d.getTime())));
  const visibleDaySet = new Set(visibleStarts.map((d) => toLocalIsoDate(d)));

  return {
    startDate: toLocalIsoDate(rangeStart),
    startHour: Math.min(...visibleStarts.map((d) => d.getHours())),
    endHour: latestVisible.getMinutes() > 0 ? latestVisible.getHours() + 1 : latestVisible.getHours(),
    numDays: Math.max(visibleDaySet.size, 1),
  };
}

// Submission slot rows from the server are converted into the same key format used by the grids.
function mapSubmissionSlotsToKeys(submission, startHour, endHour) {
  return new Set(
    (submission?.slots || [])
      .map((slot) => buildGridKeyFromDate(parseSqliteDateTime(slot.startTime), startHour, endHour))
      .filter(Boolean)
  );
}

// Helper to keep route building in one place.
function buildHeatmapPath(role, heatmapId) {
  return `/heatmap/${role}/${heatmapId}`;
}

// Sends the user back to the right dashboard depending on who is currently logged in.
function buildDashboardPath(user) {
  if (!user?.role) return '/';
  return user.role === 'professor'
    ? '/dashboard/professor'
    : '/dashboard/student';
}

export default function Heatmap() {
  // Router + session setup for deciding which heatmap page is being shown.
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams();
  const { user: sessionUser } = useAppShellSession();
  const sessionNav = useMemo(() => sessionUserToNavUser(sessionUser), [sessionUser]);

  // `new` means this route should create a heatmap first, then redirect to the real ID.
  const isNewHeatmapRoute = eventId === 'new';
  // Student links use a different path from the professor version.
  const isStudentPath = location.pathname.startsWith('/heatmap/student/');

  // Build the user object this page actually needs from the session data.
  const user = useMemo(() => {
    if (!sessionUser) return null;
    return {
      id: sessionUser.user_id,
      name: sessionNav?.name || '',
      email: sessionUser.mcgill_email,
      role: sessionNav?.role || 'student',
    };
  }, [sessionUser, sessionNav]);

  // Small convenience flag used all over the UI.
  const isProfessor = sessionNav?.role === 'professor';

  // If a professor accidentally opens the student share link, redirect them to the professor view.
  useEffect(() => {
    if (isStudentPath && isProfessor && eventId && !isNewHeatmapRoute) {
      navigate(`/heatmap/professor/${eventId}`, { replace: true });
    }
  }, [isStudentPath, isProfessor, eventId, isNewHeatmapRoute, navigate]);
  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '';

  // These values control which week/hours the grid shows.
  const [startDate, setStartDate] = useState('2026-04-07');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);
  const [numDays, setNumDays] = useState(5);
  const [setupDone, setSetupDone] = useState(false);

  // Derived display helpers for rendering the grid.
  const days = useMemo(() => generateDays(startDate, numDays), [startDate, numDays]);
  const times = useMemo(() => generateTimes(startHour, endHour), [startHour, endHour]);

  // Core state for professor selections, student selections, tabs, modals, and loaded data.
  const [profSelected, setProfSelected] = useState(new Set());
  const [profSaved, setProfSaved] = useState(new Set());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  const [studSelected, setStudSelected] = useState(new Set());
  const [tab, setTab] = useState('personal');
  const [activeNames, setActive] = useState(new Set());
  const [groupKey, setGroupKey] = useState(null);
  const [groupMeta, setGroupMeta] = useState(null);
  const [notifDismissed, setNotifDismissed] = useState(false);
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  const [heatmapBundle, setHeatmapBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Main bundle pieces pulled apart for easier use below.
  const heatmap = heatmapBundle?.heatmap;
  const allSubmissions = useMemo(() => heatmapBundle?.submissions || [], [heatmapBundle]);
  const currentHeatmapId = heatmap?.id || (isNewHeatmapRoute ? null : Number(eventId));
  const hostSubmission = allSubmissions.find((submission) => submission.participantRole === 'host') || null;
  const participantSubmissions = useMemo(
    () => allSubmissions.filter((submission) => submission.participantRole !== 'host'),
    [allSubmissions]
  );
  const pendingSubmissions = useMemo(
    () => participantSubmissions.filter((submission) => submission.status === 'pending'),
    [participantSubmissions]
  );
  const pendingCount = pendingSubmissions.length;

  // Group mode needs a compact list of participants with colors and slot keys.
  // All student submissions are included (not just pending) so the heatmap
  // correctly reflects everyone who answered.
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


  // Main data load for the page.
  // Either create a brand new heatmap or fetch an existing one from the backend.
  useEffect(() => {
    let active = true;

    async function loadHeatmapData() {
      setLoading(true);
      setError('');

      try {
        let bundle = null;

        if (isNewHeatmapRoute) {
          if (!user?.id) return;

          // New professor heatmaps start with default metadata, then we redirect to the real route.
          bundle = await createHeatmap({
            created_by: user.id,
            hm_title: 'Office Hours Heatmap',
            hm_description: 'Shared availability collection for bookings',
            visibility: 'public',
            time_zone: 'America/Toronto',
          });

          const nextRole = 'professor';
          navigate(buildHeatmapPath(nextRole, bundle.heatmap.id), { replace: true });
        } else {
          bundle = await getHeatmap(eventId);
        }

        if (!active) return;

        setHeatmapBundle(bundle);

        const allSlots = bundle.submissions.flatMap((submission) => submission.slots);
        const derivedRange = deriveRangeFromSlots(allSlots);
        if (derivedRange) {
          // If existing data already has slots, fit the grid to that range automatically.
          setStartDate(derivedRange.startDate);
          setStartHour(derivedRange.startHour);
          setEndHour(Math.max(derivedRange.endHour, derivedRange.startHour + 1));
          setNumDays(derivedRange.numDays);
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

  // When submission participants change, default group mode to showing everyone.
  useEffect(() => {
    if (participants.length > 0) {
      setActive(new Set(participants.map((participant) => participant.name)));
    } else {
      setActive(new Set());
    }
  }, [participants]);

  // Keep the professor grid in sync with whatever the saved host submission currently is.
  useEffect(() => {
    if (!hostSubmission) {
      setProfSelected(new Set());
      setProfSaved(new Set());
      return;
    }

    const hostKeys = mapSubmissionSlotsToKeys(hostSubmission, startHour, endHour);
    setProfSelected(new Set(hostKeys));
    setProfSaved(new Set(hostKeys));
  }, [hostSubmission, startHour, endHour]);

  // Keep the student grid in sync with the current student's saved submission, if one exists.
  useEffect(() => {
    if (!user) return;
    const mySubmission = allSubmissions.find((submission) => submission.userId === user.id && submission.participantRole !== 'host');
    setStudSelected(mapSubmissionSlotsToKeys(mySubmission, startHour, endHour));
  }, [allSubmissions, user, startHour, endHour]);

  // For the student heatmap: count how many OTHER students picked each slot.
  const otherStudentData = useMemo(() => {
    const otherStudents = participantSubmissions.filter((s) => s.userId !== user?.id);
    const counts = new Map();
    otherStudents.forEach((sub) => {
      mapSubmissionSlotsToKeys(sub, startHour, endHour).forEach((key) => {
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    return { counts, total: otherStudents.length };
  }, [participantSubmissions, user?.id, startHour, endHour]);

  // Saves the professor's chosen availability back to the backend.
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
      setProfSaved(savedKeys);

      // Quick user feedback after save.
      alert(
        isRecurring
          ? `${profSelected.size} slots saved and repeated for ${recurringWeeks} week(s).`
          : `${profSelected.size} slots saved for this week only.`
      );
    } catch (err) {
      setError(err.message || 'Unable to save professor availability.');
    }
  }

  // Students use this to submit their selected times for professor review.
  async function submitStudentAvailability() {
    if (!user) return;
    try {
      const bundle = await saveHeatmapSubmission(currentHeatmapId, {
        user_id: user.id,
        participant_role: 'attendee',
        status: 'pending',
        slots: keysToSlots(studSelected, startHour),
      });

      setHeatmapBundle(bundle);
      alert(`Availability submitted! ${heatmap?.hostName || 'The professor'} can now review it.`);
    } catch (err) {
      setError(err.message || 'Unable to submit availability.');
    }
  }

  // Approving a submission creates a real appointment and marks that submission as handled.
  async function approveSubmission(sub, selectedSlot) {
    try {
      if (!selectedSlot) {
        setError('This submission does not contain any slots to approve.');
        return;
      }

      const response = await createHeatmapAppointment(currentHeatmapId, {
        host_user_id: heatmap.createdBy,
        attendee_user_ids: [sub.userId],
        start_time: selectedSlot.startTime,
        end_time: selectedSlot.endTime,
        ap_title: `Heatmap booking with ${sub.userName}`,
        ap_description: `Created from heatmap approval for ${sub.userName}`,
        location: 'Heatmap booking',
        changed_by: user?.id || heatmap.createdBy,
        approved_submission_ids: [sub.id],
      });

      setHeatmapBundle(response.heatmap);
      setModal(null);
      setActiveSub(null);
      navigate('/dashboard/professor');
    } catch (err) {
      setError(err.message || 'Unable to approve submission.');
    }
  }

  // Declining just updates the submission status without creating a booking.
  async function declineSubmission(sub) {
    try {
      const bundle = await updateHeatmapSubmissionStatus(sub.id, 'declined');
      setHeatmapBundle(bundle);
    } catch (err) {
      setError(err.message || 'Unable to decline submission.');
    }
  }

  function handleGroupSelect(key, meta) {
    setGroupKey(key);
    setGroupMeta(meta);
  }

  // Group confirmation creates one shared appointment for everyone selected in the overlap cell.
  async function handleConfirmSlot() {
    try {
      const startEnd = keyToDateRange(groupKey, startHour);
      const response = await createHeatmapAppointment(currentHeatmapId, {
        host_user_id: heatmap.createdBy,
        attendee_user_ids: groupMeta.who.map((participant) => participant.userId),
        start_time: toLocalDateTime(startEnd.start),
        end_time: toLocalDateTime(startEnd.end),
        ap_title: `Group heatmap booking`,
        ap_description: `Created from heatmap group confirmation`,
        location: 'Heatmap group booking',
        changed_by: user?.id || heatmap.createdBy,
        approved_submission_ids: groupMeta.who
          .filter((participant) => participant.status === 'pending')
          .map((participant) => participant.submissionId)
          .filter(Boolean),
      });

      setHeatmapBundle(response.heatmap);
      setGroupKey(null);
      setGroupMeta(null);
      setModal(null);
      navigate('/dashboard/professor');
    } catch (err) {
      setError(err.message || 'Unable to confirm group booking.');
    }
  }

  return (
    <>
      {/* Shared top nav for the heatmap page. */}
      <Navbar
        logo={logo}
        title="Heatmap Booking"
        user={user ? { displayName: user.name, role: user.role, initials: userInitials } : undefined}
        actions={[
          { label: 'Back to dashboard', onClick: () => navigate(buildDashboardPath(user)) },
        ]}
      />

      <div className="heatmap-page">
        {/* Intro copy changes slightly depending on whether this is professor or student view. */}
        <div className="page-header">
          <div className="page-label">
            {isProfessor ? 'Professor Dashboard' : 'Student View'}
          </div>
          <h1 className="page-title">
            {isProfessor ? 'Set your availability' : 'Book a slot'}
          </h1>
          <p className="page-subtitle">
            {isProfessor
              ? "Mark when you're free. Choose whether slots repeat weekly."
              : `Select times that work for you from ${heatmap?.hostName || 'the professor'}'s available slots.`}
          </p>
        </div>

        {/* Basic loading/error feedback. */}
        {loading && <p style={{ color: '#666', marginBottom: 16 }}>Loading heatmap...</p>}
        {error && <p style={{ color: '#cc2222', marginBottom: 16 }}>{error}</p>}

        {/* Professors get a notification banner when there are pending student submissions to review. */}
        {isProfessor && pendingCount > 0 && !notifDismissed && (
          <div className="notification-banner">
            <span>📬</span>
            <span>
              <strong>{pendingCount} new submission{pendingCount > 1 ? 's' : ''}</strong> waiting for your review.
            </span>
            <div className="notification-banner-actions">
              <button className="button button-outline button-small" onClick={() => setTab('submissions')}>
                Review now
              </button>
              <button className="button button-ghost" onClick={() => setNotifDismissed(true)}>✕</button>
            </div>
          </div>
        )}

        {/* These cards switch between the major modes of the page. */}
        <div className="mode-cards">
          <div className={`mode-card${tab === 'personal' ? ' active' : ''}`} onClick={() => setTab('personal')}>
            <div className={`mode-card-icon ${isProfessor ? 'professor' : 'student'}`}>
              {isProfessor ? '' : ''}
            </div>
            <h4>{isProfessor ? 'My availability' : 'Select your slots'}</h4>
            <p>
              {isProfessor
                ? "Click and drag to mark times you're free. Set recurring or one-time."
                : "Pink cells are the professor's available times. Select yours."}
            </p>
          </div>

          {isProfessor ? (
            <div className={`mode-card${tab === 'submissions' ? ' active' : ''}`} onClick={() => setTab('submissions')}>
              <div className="mode-card-icon professor">📨</div>
              <h4>
                Student submissions
                {pendingCount > 0 && (
                  <span style={{ marginLeft: 8, background: 'var(--red)', color: '#fff', borderRadius: 10, padding: '1px 7px', fontSize: 11 }}>
                    {pendingCount}
                  </span>
                )}
              </h4>
              <p>Review and approve availability requests from students.</p>
            </div>
          ) : null}

          {isProfessor && (
            <div className={`mode-card${tab === 'group' ? ' active' : ''}`} onClick={() => setTab('group')}>
              <div className="mode-card-icon professor">🌡️</div>
              <h4>Availability heatmap</h4>
              <p>See all students' availability at once. Darker cells = more students free.</p>
            </div>
          )}
        </div>

        {/* Before using the grid, the user can choose which week and hours should be visible. */}
        {!setupDone && (
          <div className="setup-banner">
            <div className="setup-banner-left">
              <h3>Set the date range</h3>
              <p>Choose which week and hours to display on the grid.</p>
            </div>
            <div className="setup-controls">
              <div className="setup-field">
                <label>Start date</label>
                <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="setup-field">
                <label>Days shown</label>
                <select value={numDays} onChange={(e) => setNumDays(Number(e.target.value))}>
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                </select>
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
              <button className="button button-primary" style={{ alignSelf: 'flex-end' }} onClick={() => setSetupDone(true)}>
                Apply
              </button>
            </div>
          </div>
        )}

        {/* Once setup is applied, show a short summary of the current visible range. */}
        {setupDone && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing <strong style={{ color: 'var(--text)' }}>{days[0]?.date} – {days[days.length - 1]?.date}</strong>, {startHour <= 12 ? startHour : startHour - 12}:00 {startHour < 12 ? 'AM' : 'PM'} {' – '} {endHour <= 12 ? endHour : endHour - 12}:00 {endHour < 12 ? 'AM' : 'PM'}
            </span>
            <button className="button button-ghost button-small" onClick={() => setSetupDone(false)}>
              Change
            </button>
          </div>
        )}

        {/* Professor personal mode: mark and save available times. */}
        {isProfessor && tab === 'personal' && (
          <>
            <p className="section-label">Click or drag to mark when you're free</p>
            <div className="grid-outer">
              <PersonalGrid days={days} times={times} selected={profSelected} setSelected={setProfSelected} />
            </div>

            <div style={{ marginTop: '1.25rem', padding: '1rem 1.25rem', background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', display: 'flex', alignItems: 'center', gap: '1.5rem', flexWrap: 'wrap' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input type="radio" name="recurrence" checked={!isRecurring} onChange={() => setIsRecurring(false)} style={{ accentColor: 'var(--red)', width: 16, height: 16 }} />
                <span>
                  <strong>One-time only</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                    — only visible for {days[0]?.date}{numDays > 1 ? ` – ${days[days.length - 1]?.date}` : ''}
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

        {/* Professor submissions mode: review student responses one by one. */}
        {isProfessor && tab === 'submissions' && (
          <>
            <p className="section-label">Student submissions</p>
            {participantSubmissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon"></div>
                <h4>No submissions yet</h4>
                <p>Students will appear here once they submit their availability.</p>
              </div>
            ) : (
              participantSubmissions.map((sub) => (
                <div key={sub.id} className="submission-card">
                  <div className="submission-info">
                    <h4>{sub.userName}</h4>
                    <p>{sub.userEmail} · {sub.slots.length} slots · {new Date(sub.submittedAt).toLocaleString()}</p>
                    <div className="progress-bar-container" style={{ width: 160 }}>
                      <div className="progress-bar-fill" style={{ width: `${Math.min((sub.slots.length / Math.max(times.length, 1)) * 100, 100)}%` }} />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {sub.status === 'approved' ? (
                      <span className="badge-success">✓ Approved</span>
                    ) : sub.status === 'declined' ? (
                      <span style={{ fontSize: 12, color: '#cc2222' }}>Declined</span>
                    ) : (
                      <>
                        <button className="button button-outline button-small" onClick={() => { setActiveSub(sub); setModal('approve'); }}>
                          Review
                        </button>
                        <a href={`mailto:${sub.userEmail}?subject=Re: Your availability submission`} className="button button-ghost button-small" style={{ textDecoration: 'none' }}>
                          Email
                        </a>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}

        {/* Student mode: choose only from the professor's published slots. */}
        {!isProfessor && tab === 'personal' && (
          <>
            <div className="legend" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px 16px' }}>
              {otherStudentData.total > 0 ? (
                <>
                  <span className="legend-label">0 students free</span>
                  <div className="legend-colors">
                    {Array.from({ length: otherStudentData.total + 1 }, (_, i) => (
                      <div key={i} className="color-swatch" style={{ background: i === 0 ? '#ffe0e3' : `rgba(227,20,41,${Math.max(0.12, i / otherStudentData.total)})` }} />
                    ))}
                  </div>
                  <span className="legend-label">All {otherStudentData.total} free</span>
                  <div className="color-swatch" style={{ background: 'var(--red)', borderRadius: 3, marginLeft: 8, outline: '2px solid var(--red)', outlineOffset: 1 }} />
                  <span className="legend-label">Your selection</span>
                  <div className="color-swatch" style={{ background: 'var(--cell-empty)', borderRadius: 3, marginLeft: 8 }} />
                  <span className="legend-label">Prof unavailable</span>
                </>
              ) : (
                <>
                  <div className="color-swatch" style={{ background: '#ffe0e3', border: '1.5px solid #f5b0b8', borderRadius: 3 }} />
                  <span className="legend-label">Professor available</span>
                  <div className="color-swatch" style={{ background: 'var(--red)', borderRadius: 3, marginLeft: 12 }} />
                  <span className="legend-label">Your selection</span>
                  <div className="color-swatch" style={{ background: 'var(--cell-empty)', borderRadius: 3, marginLeft: 12 }} />
                  <span className="legend-label">Not available</span>
                </>
              )}
            </div>
            <p className="section-label">Select from the professor's available slots</p>
            <div className="grid-outer">
              <ProfAvailGrid
                days={days}
                times={times}
                profSlots={profSaved}
                selected={studSelected}
                setSelected={setStudSelected}
                otherSlotCounts={otherStudentData.counts}
                totalOthers={otherStudentData.total}
              />
            </div>
            <div className="confirm-bar">
              <button className="button button-primary" onClick={submitStudentAvailability} disabled={studSelected.size === 0}>
                Submit availability
              </button>
              <button className="button button-outline" onClick={() => setStudSelected(new Set())}>
                Clear
              </button>
              <span className="selected-info">
                <strong>{studSelected.size}</strong> slot{studSelected.size !== 1 ? 's' : ''} selected
                {profSaved.size === 0 && <span style={{ color: '#cc8800', marginLeft: 8 }}>(Professor hasn't published slots yet)</span>}
              </span>
            </div>
          </>
        )}

        {/* Group mode: heatmap of all student submissions. */}
        {isProfessor && tab === 'group' && (
          <>
            <p className="section-label">All respondents ({participants.length})</p>
            {participants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">🌡️</div>
                <h4>No student submissions yet</h4>
                <p>Once students submit their availability, you'll see a heatmap here. Darker cells mean more students are free at that time.</p>
              </div>
            ) : (
              <>
                <div className="participants">
                  {participants.map((participant) => (
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
                  <GroupGrid days={days} times={times} participants={participants} activeNames={activeNames} selectedKey={groupKey} onSelectKey={handleGroupSelect} />
                </div>
                <div className="confirm-bar">
                  <button className="button button-primary" onClick={() => setModal('confirm')} disabled={!groupKey}>
                    Confirm selected slot
                  </button>
                  <span className="selected-info">
                    {groupMeta
                      ? <><strong>{groupMeta.timeLabel}</strong> on {groupMeta.day?.short} {groupMeta.day?.date} — {groupMeta.count}/{groupMeta.max} free</>
                      : 'Click a cell to select it'}
                  </span>
                </div>
              </>
            )}
          </>
        )}

        {/* Group booking confirmation modal. */}
        {modal === 'confirm' && groupMeta && (
          <ConfirmSlotModal slot={groupMeta} attendees={groupMeta.who} onConfirm={handleConfirmSlot} onClose={() => setModal(null)} />
        )}

        {/* General slot detail popup. */}
        {modal === 'detail' && activeAppt && (
          <SlotDetailModal appointment={activeAppt} isOwner={isProfessor} onDelete={() => setModal('delete')} onClose={() => setModal(null)} />
        )}

        {/* Delete confirmation popup.
            Right now this clears the selected appointment locally rather than deleting a heatmap slot from the backend. */}
        {modal === 'delete' && activeAppt && (
          <DeleteConfirmModal
            appointment={{ ...activeAppt, notifyEmail: isProfessor ? activeAppt.ownerEmail : heatmap?.hostEmail || user?.email }}
            onConfirm={() => setActiveAppt(null)}
            onClose={() => setModal('detail')}
          />
        )}

        {/* Shareable invite link for students. */}
        {modal === 'invite' && (
          <InviteURLModal
            ownerEmail={heatmap?.hostEmail || user.email}
            eventTitle={heatmap?.title || 'Heatmap Booking'}
            inviteURL={`${window.location.origin}/heatmap/student/${currentHeatmapId}`}
            onClose={() => setModal(null)}
          />
        )}

        {/* Professor review modal for approving or declining a student's submission. */}
        {modal === 'approve' && activeSub && (
          <ApproveSubmissionModal
            submission={{
              ...activeSub,
              studentName: activeSub.userName,
              studentEmail: activeSub.userEmail,
              slotCount: activeSub.slots.length,
            }}
            onApprove={approveSubmission}
            onDecline={declineSubmission}
            onClose={() => { setModal(null); setActiveSub(null); }}
          />
        )}
      </div>
    </>
  );
}
