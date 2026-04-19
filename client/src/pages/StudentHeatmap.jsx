/*AMANDA TRAN*/
// React state/effect hooks plus router helpers for route-based heatmap pages.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// Shared heatmap styling for setup controls, legends, grids, and action bars.
import '../styles/Heatmap.css';
// Shared page chrome and session helpers.
import logo from '../assets/logo1.png';
import Navbar from '../components/Navbar';
import useAppShellSession from '../hooks/useAppShellSession';
import { sessionUserToNavUser } from '../auth/authUtils';
// Student view uses the professor-availability grid, where only professor slots are selectable.
import { ProfAvailGrid } from '../components/HeatmapGrid';
// Backend helpers for loading a heatmap and saving the student's response.
import { getHeatmap, saveHeatmapSubmission } from '../api/heatmaps';
// Calendar-grid helpers that produce the visible day and time labels.
import { generateDays, generateTimes } from '../utils/generateDays';
// Shared conversion helpers used by both heatmap pages.
import {
  buildDashboardPath,
  deriveRangeFromSlots,
  keysToSlots,
  mapSubmissionSlotsToKeys,
} from '../utils/heatmapPageUtils';

export default function StudentHeatmap() {
  // Router data: eventId is the heatmap ID from the invite link.
  const navigate = useNavigate();
  const { eventId } = useParams();
  // Session data is converted into the smaller shape this page needs.
  const { user: sessionUser } = useAppShellSession();
  const sessionNav = useMemo(() => sessionUserToNavUser(sessionUser), [sessionUser]);

  // Local user object used for nav display and saving student availability.
  const user = useMemo(() => {
    if (!sessionUser) return null;
    return {
      id: sessionUser.user_id,
      name: sessionNav?.name || '',
      email: sessionUser.mcgill_email,
      role: sessionNav?.role || 'student',
    };
  }, [sessionUser, sessionNav]);

  const userInitials = user?.name
    ? user.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '';

  // Controls which dates and hours are visible in the heatmap grid.
  const [startDate, setStartDate] = useState('2026-04-07');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);
  const [numDays, setNumDays] = useState(5);
  const [setupDone, setSetupDone] = useState(false);
  const days = useMemo(() => generateDays(startDate, numDays), [startDate, numDays]);
  const times = useMemo(() => generateTimes(startHour, endHour), [startHour, endHour]);

  // Student selections, professor-published slots, loaded heatmap data, and page status.
  const [studSelected, setStudSelected] = useState(new Set());
  const [profSaved, setProfSaved] = useState(new Set());
  const [heatmapBundle, setHeatmapBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pull apart the heatmap bundle so render logic can stay readable.
  const heatmap = heatmapBundle?.heatmap;
  const allSubmissions = useMemo(() => heatmapBundle?.submissions || [], [heatmapBundle]);
  const hostSubmission = allSubmissions.find((submission) => submission.participantRole === 'host') || null;
  const participantSubmissions = useMemo(
    () => allSubmissions.filter((submission) => submission.participantRole !== 'host'),
    [allSubmissions]
  );

  // If a professor opens a student invite URL, send them to the professor version.
  useEffect(() => {
    if (user?.role === 'professor' && eventId) {
      navigate(`/heatmap/professor/${eventId}`, { replace: true });
    }
  }, [eventId, navigate, user?.role]);

  // Load the heatmap from the invite ID and fit the grid to any existing saved slots.
  useEffect(() => {
    let active = true;

    async function loadHeatmapData() {
      setLoading(true);
      setError('');

      try {
        const bundle = await getHeatmap(eventId);

        if (!active) return;

        setHeatmapBundle(bundle);

        // Existing heatmaps may already define their week/hour range through saved slots.
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
  }, [eventId]);

  // Keep the selectable professor slots synced with the host's saved availability.
  useEffect(() => {
    if (!hostSubmission) {
      setProfSaved(new Set());
      return;
    }

    setProfSaved(mapSubmissionSlotsToKeys(hostSubmission, startHour, endHour));
  }, [hostSubmission, startHour, endHour]);

  // If this student has already submitted, pre-fill their previous choices.
  useEffect(() => {
    if (!user) return;
    const mySubmission = allSubmissions.find((submission) => submission.userId === user.id && submission.participantRole !== 'host');
    setStudSelected(mapSubmissionSlotsToKeys(mySubmission, startHour, endHour));
  }, [allSubmissions, user, startHour, endHour]);

  // Count how many other students selected each slot for the student-facing heatmap shading.
  const otherStudentData = useMemo(() => {
    const otherStudents = participantSubmissions.filter((submission) => submission.userId !== user?.id);
    const counts = new Map();
    otherStudents.forEach((submission) => {
      mapSubmissionSlotsToKeys(submission, startHour, endHour).forEach((key) => {
        counts.set(key, (counts.get(key) || 0) + 1);
      });
    });
    return { counts, total: otherStudents.length };
  }, [participantSubmissions, user?.id, startHour, endHour]);

  // Save the student's selected slots as a pending response for professor review.
  async function submitStudentAvailability() {
    if (!user) return;
    try {
      const bundle = await saveHeatmapSubmission(eventId, {
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

  return (
    <>
      {/* Shared top navbar for returning to dashboard and showing student identity. */}
      <Navbar
        logo={logo}
        title="Heatmap Booking"
        user={user ? { displayName: user.name, role: user.role, initials: userInitials } : undefined}
        actions={[{ label: 'Back to dashboard', onClick: () => navigate(buildDashboardPath(user)) }]}
      />

      <div className="heatmap-page">
        {/* Page intro explains whose availability the student is responding to. */}
        <div className="page-header">
          <div className="page-label">Student View</div>
          <h1 className="page-title">Book a slot</h1>
          <p className="page-subtitle">
            Select times that work for you from {heatmap?.hostName || 'the professor'}'s available slots.
          </p>
        </div>

        {/* Lightweight page feedback while data loads or if a backend call fails. */}
        {loading && <p style={{ color: '#666', marginBottom: 16 }}>Loading heatmap...</p>}
        {error && <p style={{ color: '#cc2222', marginBottom: 16 }}>{error}</p>}

        {/* Student page has one mode card because students only submit their own slots. */}
        <div className="mode-cards">
          <div className="mode-card active">
            <div className="mode-card-icon student"></div>
            <h4>Select your slots</h4>
            <p>Pink cells are the professor's available times. Select yours.</p>
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

        {/* Compact summary after setup is applied, with a button to edit the range again. */}
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

        {/* Legend explains professor availability, student selection, and peer heat intensity. */}
        <div className="legend" style={{ marginBottom: '0.75rem', flexWrap: 'wrap', gap: '8px 16px' }}>
          {otherStudentData.total > 0 ? (
            <>
              <span className="legend-label">0 students free</span>
              <div className="legend-colors">
                {Array.from({ length: otherStudentData.total + 1 }, (_, i) => (
                  // Darker red means more other students are free at that same time.
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

        {/* Main student grid: only professor-published slots can be clicked. */}
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
        {/* Submit bar shows selected count and prevents empty submissions. */}
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
      </div>
    </>
  );
}
