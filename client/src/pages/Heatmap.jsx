/*AMANDA TRAN*/
import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import '../styles/Heatmap.css';
import logo from '../assets/logo1.png';
import Navbar from '../components/Navbar';
import useAppShellSession from '../hooks/useAppShellSession';
import { sessionUserToNavUser } from '../auth/authUtils';
import { PersonalGrid, ProfAvailGrid, GroupGrid, HeatmapLegend, makeKey } from '../components/HeatmapGrid';
import {
  ConfirmSlotModal,
  SlotDetailModal,
  DeleteConfirmModal,
  InviteURLModal,
  ApproveSubmissionModal,
} from '../components/Modals';
import { createHeatmap, createHeatmapAppointment, getHeatmap, saveHeatmapSubmission, updateHeatmapSubmissionStatus } from '../api/heatmaps';
import { getUser, getUsers } from '../api/users';
import { generateDays, generateTimes } from '../utils/generateDays';

const PARTICIPANT_COLORS = ['#E31429', '#c0842a', '#2a8c5f', '#5a4ab0', '#1565a8', '#cc4b37'];

const SAMPLE_SUBMISSIONS = [
  { id: 1, studentName: 'Jocelyn',  studentEmail: 'jocelyn@mail.mcgill.ca',  slotCount: 6,  submittedAt: 'Today, 9:14 AM',  status: 'pending' },
  { id: 2, studentName: 'Rita',  studentEmail: 'rita@mail.mcgill.ca',  slotCount: 4,  submittedAt: 'Today, 10:32 AM', status: 'pending' },
  { id: 3, studentName: 'Shirley',   studentEmail: 'shirley@mail.mcgill.ca',   slotCount: 8,  submittedAt: 'Yesterday',       status: 'approved' },
];

/** Demo mailto target until the heatmap host is returned by the API */
const HEATMAP_ORGANIZER_FALLBACK_EMAIL = 'organizer@mcgill.ca';

// ─────────────────────────────────────────────────────────────
// expandRecurring
//   Takes a Set of "iso:ti" keys selected on a specific week,
//   plus the number of weeks to repeat, and returns a new Set
//   that includes the original week + all future occurrences.
//
//   e.g. "2026-04-07:3" recurring for 4 weeks also generates
//        "2026-04-14:3", "2026-04-21:3", "2026-04-28:3"
// ─────────────────────────────────────────────────────────────
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

function parseSqliteDateTime(value) {
  return new Date(String(value).replace(' ', 'T'));
}

function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function toLocalDateTime(date) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  return `${toLocalIsoDate(date)}T${hours}:${minutes}:${seconds}`;
}

function buildGridKeyFromDate(date, startHour, endHour) {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const slotIndex = (hour - startHour) * 2 + (minute >= 30 ? 1 : 0);
  const totalSlots = (endHour - startHour) * 2;

  if (slotIndex < 0 || slotIndex >= totalSlots) return null;
  return makeKey(toLocalIsoDate(date), slotIndex);
}

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

function keyToDateRange(key, startHour) {
  const [iso, timeIndexString] = key.split(':');
  const timeIndex = Number(timeIndexString);
  const start = new Date(`${iso}T00:00:00`);
  start.setHours(startHour + Math.floor(timeIndex / 2), timeIndex % 2 === 0 ? 0 : 30, 0, 0);
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return { start, end };
}

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

function mapSubmissionSlotsToKeys(submission, startHour, endHour) {
  return new Set(
    (submission?.slots || [])
      .map((slot) => buildGridKeyFromDate(parseSqliteDateTime(slot.startTime), startHour, endHour))
      .filter(Boolean)
  );
}

function buildHeatmapPath(role, heatmapId) {
  return `/heatmap/${role}/${heatmapId}`;
}

function buildDashboardPath(user) {
  if (!user?.role) return '/';
  return user.role === 'professor'
    ? '/dashboard/professor'
    : '/dashboard/student';
}

export default function Heatmap() {
  const navigate = useNavigate();
  const location = useLocation();
  const { eventId } = useParams();
  const searchParams = new URLSearchParams(location.search);
  const requestedUserId = searchParams.get('userId');
  const roleFromQuery = searchParams.get('role');

  const isShellStudentHeatmap = location.pathname.startsWith('/heatmap/student/');
  const isShellProfessorHeatmap = location.pathname.startsWith('/heatmap/professor/');

  const { user: sessionUser } = useAppShellSession();
  const sessionNav = useMemo(() => sessionUserToNavUser(sessionUser), [sessionUser]);

  const requestedRole = useMemo(() => {
    if (isShellStudentHeatmap) return 'student';
    if (isShellProfessorHeatmap) return 'professor';
    return roleFromQuery;
  }, [isShellStudentHeatmap, isShellProfessorHeatmap, roleFromQuery]);

  const isNewHeatmapRoute = eventId === 'new';
  const hideDemoRoleSwitcher = isShellStudentHeatmap || isShellProfessorHeatmap;

  const [availableUsers, setAvailableUsers] = useState({ professor: null, student: null });
  const [user, setUser] = useState(null);
  const isProfessor = useMemo(() => {
    if (hideDemoRoleSwitcher) {
      return sessionNav?.role === 'professor';
    }
    return user?.role === 'professor';
  }, [hideDemoRoleSwitcher, sessionNav?.role, user?.role]);
  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '';

  const [startDate, setStartDate] = useState('2026-04-07');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);
  const [numDays, setNumDays] = useState(5);
  const [setupDone, setSetupDone] = useState(false);

  const days = useMemo(() => generateDays(startDate, numDays), [startDate, numDays]);
  const times = useMemo(() => generateTimes(startHour, endHour), [startHour, endHour]);

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

  const participants = useMemo(
    () =>
      pendingSubmissions.map((submission, index) => ({
        submissionId: submission.id,
        userId: submission.userId,
        name: submission.userName,
        color: PARTICIPANT_COLORS[index % PARTICIPANT_COLORS.length],
        status: submission.status,
        slots: Array.from(mapSubmissionSlotsToKeys(submission, startHour, endHour)),
      })),
    [pendingSubmissions, startHour, endHour]
  );

  useEffect(() => {
    let active = true;

    async function loadUsers() {
      try {
        const [professors, students] = await Promise.all([
          getUsers('professor'),
          getUsers('student'),
        ]);

        if (!active) return;

        const professorUser = professors[0] || null;
        const studentUser = students[0] || null;

        setAvailableUsers({ professor: professorUser, student: studentUser });

        if (requestedUserId) {
          const currentUser = await getUser(requestedUserId);
          if (!active) return;
          setUser({
            id: currentUser.id,
            name: currentUser.name,
            email: currentUser.email,
            role: requestedRole || currentUser.role,
          });
          return;
        }

        const defaultUser = (requestedRole === 'student' ? studentUser : professorUser) || professorUser || studentUser;
        if (!defaultUser) return;

        setUser({
          id: defaultUser.id,
          name: defaultUser.name,
          email: defaultUser.email,
          role: requestedRole || defaultUser.role,
        });
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Unable to load user information.');
      }
    }

    loadUsers();
    return () => {
      active = false;
    };
  }, [requestedRole, requestedUserId]);

  useEffect(() => {
    let active = true;

    async function loadHeatmapData() {
      setLoading(true);
      setError('');

      try {
        let bundle = null;

        if (isNewHeatmapRoute) {
          const creatorId = availableUsers.professor?.id || user?.id;
          if (!creatorId) {
            return;
          }

          bundle = await createHeatmap({
            created_by: creatorId,
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
  }, [availableUsers.professor?.id, eventId, isNewHeatmapRoute, navigate, requestedUserId, user?.id]);

  useEffect(() => {
    if (participants.length > 0) {
      setActive(new Set(participants.map((participant) => participant.name)));
    } else {
      setActive(new Set());
    }
  }, [participants]);

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

  useEffect(() => {
    if (!user) return;
    const mySubmission = allSubmissions.find((submission) => submission.userId === user.id && submission.participantRole !== 'host');
    setStudSelected(mapSubmissionSlotsToKeys(mySubmission, startHour, endHour));
  }, [allSubmissions, user, startHour, endHour]);

  async function saveProfAvailability() {
    if (!availableUsers.professor) return;
    const savedKeys = isRecurring ? expandRecurring(profSelected, recurringWeeks) : new Set(profSelected);

    try {
      const bundle = await saveHeatmapSubmission(currentHeatmapId, {
        user_id: availableUsers.professor.id,
        participant_role: 'host',
        status: 'approved',
        slots: keysToSlots(savedKeys, startHour),
      });

      setHeatmapBundle(bundle);
      setProfSaved(savedKeys);

      alert(
        isRecurring
          ? `${profSelected.size} slots saved and repeated for ${recurringWeeks} week(s).`
          : `${profSelected.size} slots saved for this week only.`
      );
    } catch (err) {
      setError(err.message || 'Unable to save professor availability.');
    }
  }

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
      alert(`Availability submitted! ${heatmap?.hostName || availableUsers.professor?.name || 'The professor'} can now review it.`);
    } catch (err) {
      setError(err.message || 'Unable to submit availability.');
    }
  }

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
        approved_submission_ids: groupMeta.who.map((participant) => participant.submissionId).filter(Boolean),
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
      <Navbar
        logo={logo}
        title="Heatmap Booking"
        user={user ? { displayName: user.name, role: user.role, initials: userInitials } : undefined}
        actions={[
          { label: 'Back to dashboard', onClick: () => navigate(buildDashboardPath(user)) },
        ]}
      />

      <div className="heatmap-page">
        {!hideDemoRoleSwitcher && (
          <div style={{ marginBottom: '0.5rem' }}>
            <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
              Demo — viewing as:
            </span>
            <div className="role-switcher" style={{ display: 'inline-flex' }}>
              <button
                className={`role-button${isProfessor ? ' active' : ''}`}
                onClick={() => {
                  if (!availableUsers.professor) return;
                  setUser({
                    id: availableUsers.professor.id,
                    name: availableUsers.professor.name,
                    email: availableUsers.professor.email,
                    role: 'professor',
                  });
                  setTab('personal');
                }}
              >
                Professor
              </button>
              <button
                className={`role-button${!isProfessor ? ' active' : ''}`}
                onClick={() => {
                  if (!availableUsers.student) return;
                  setUser({
                    id: availableUsers.student.id,
                    name: availableUsers.student.name,
                    email: availableUsers.student.email,
                    role: 'student',
                  });
                  setTab('personal');
                }}
                disabled={!availableUsers.student}
              >
                Student
              </button>
            </div>
          </div>
        )}

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

        {loading && <p style={{ color: '#666', marginBottom: 16 }}>Loading heatmap...</p>}
        {error && <p style={{ color: '#cc2222', marginBottom: 16 }}>{error}</p>}

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

        <div className="mode-cards">
          <div className={`mode-card${tab === 'personal' ? ' active' : ''}`} onClick={() => setTab('personal')}>
            <div className={`mode-card-icon ${isProfessor ? 'professor' : 'student'}`}>
              {isProfessor ? '📅' : '✋'}
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
              <div className="mode-card-icon professor">👥</div>
              <h4>Group view</h4>
              <p>See shared overlap and confirm one slot for multiple students at once.</p>
            </div>
          )}
        </div>

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

        {isProfessor && tab === 'submissions' && (
          <>
            <p className="section-label">Student submissions</p>
            {participantSubmissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
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

        {!isProfessor && tab === 'personal' && (
          <>
            <div className="legend" style={{ marginBottom: '0.75rem' }}>
              <div className="color-swatch" style={{ background: '#ffe0e3', border: '1.5px solid #f5b0b8', borderRadius: 3 }} />
              <span className="legend-label">Professor available</span>
              <div className="color-swatch" style={{ background: 'var(--red)', borderRadius: 3, marginLeft: 12 }} />
              <span className="legend-label">Your selection</span>
              <div className="color-swatch" style={{ background: 'var(--cell-empty)', borderRadius: 3, marginLeft: 12 }} />
              <span className="legend-label">Not available</span>
            </div>
            <p className="section-label">Select from the professor's available slots</p>
            <div className="grid-outer">
              <ProfAvailGrid days={days} times={times} profSlots={profSaved} selected={studSelected} setSelected={setStudSelected} />
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

        {isProfessor && tab === 'group' && (
          <>
            <p className="section-label">Participants</p>
            {participants.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">👥</div>
                <h4>No pending group submissions</h4>
                <p>Once students submit availability, you can compare overlap here and confirm one shared meeting slot.</p>
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
                <p className="section-label">Hover cells to see who's free</p>
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

        {modal === 'confirm' && groupMeta && (
          <ConfirmSlotModal slot={groupMeta} attendees={groupMeta.who} onConfirm={handleConfirmSlot} onClose={() => setModal(null)} />
        )}

        {modal === 'detail' && activeAppt && (
          <SlotDetailModal appointment={activeAppt} isOwner={isProfessor} onDelete={() => setModal('delete')} onClose={() => setModal(null)} />
        )}

        {modal === 'delete' && activeAppt && (
          <DeleteConfirmModal
            appointment={{ ...activeAppt, notifyEmail: isProfessor ? activeAppt.ownerEmail : heatmap?.hostEmail || availableUsers.professor?.email || user?.email }}
            onConfirm={() => setActiveAppt(null)}
            onClose={() => setModal('detail')}
          />
        )}

        {modal === 'invite' && (
          <InviteURLModal
            ownerEmail={heatmap?.hostEmail || user.email}
            eventTitle={heatmap?.title || 'Heatmap Booking'}
            inviteURL={`${window.location.origin}/heatmap/${currentHeatmapId}?role=student`}
            onClose={() => setModal(null)}
          />
        )}

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
