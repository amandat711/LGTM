import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/Heatmap.css';
import logo from '../assets/logo1.png';
import Navbar from '../components/Navbar';
import { PersonalGrid, ProfAvailGrid, GroupGrid, HeatmapLegend, makeKey } from '../components/HeatmapGrid';
import {
  ConfirmSlotModal,
  SlotDetailModal,
  DeleteConfirmModal,
  InviteURLModal,
  ApproveSubmissionModal,
} from '../components/Modals';
import { generateDays, generateTimes } from '../utils/generateDays';

// ─── Sample data ──────────────────────────────────────────────
const SAMPLE_PARTICIPANTS = [
  { name: 'Jocelyn',  color: '#E31429', slots: [] },
  { name: 'Rita',  color: '#c0842a', slots: [] },
  { name: 'Shirley',   color: '#2a8c5f', slots: [] },
  { name: 'Amanda',  color: '#5a4ab0', slots: [] },
];

const SAMPLE_SUBMISSIONS = [
  { id: 1, studentName: 'Jocelyn',  studentEmail: 'jocelyn@mail.mcgill.ca',  slotCount: 6,  submittedAt: 'Today, 9:14 AM',  status: 'pending' },
  { id: 2, studentName: 'Rita',  studentEmail: 'rita@mail.mcgill.ca',  slotCount: 4,  submittedAt: 'Today, 10:32 AM', status: 'pending' },
  { id: 3, studentName: 'Shirley',   studentEmail: 'shirley@mail.mcgill.ca',   slotCount: 8,  submittedAt: 'Yesterday',       status: 'approved' },
];

const PROFESSOR = { name: 'Prof. Vybihal', email: 'joseph.vybihal@mcgill.ca', role: 'professor' };
const STUDENT   = { name: 'Amanda',  email: 'amanda@mail.mcgill.ca', role: 'student' };

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
  selectedKeys.forEach(key => {
    const [iso, ti] = key.split(':');
    for (let w = 1; w <= recurringWeeks; w++) {
      const d = new Date(iso);
      d.setDate(d.getDate() + w * 7);
      expanded.add(makeKey(d.toISOString().slice(0, 10), ti));
    }
  });
  return expanded;
}

// ─────────────────────────────────────────────────────────────
export default function Heatmap() {
  const navigate              = useNavigate();
  const [user, setUser]       = useState(PROFESSOR);
  const isProfessor           = user.role === 'professor';
  const userInitials          = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();

  // ── Date range ─────────────────────────────────────────────
  const [startDate,  setStartDate]  = useState('2026-04-07');
  const [startHour,  setStartHour]  = useState(8);
  const [endHour,    setEndHour]    = useState(17);
  const [numDays,    setNumDays]    = useState(5);
  const [setupDone,  setSetupDone]  = useState(false);

  const days  = useMemo(() => generateDays(startDate, numDays),  [startDate, numDays]);
  const times = useMemo(() => generateTimes(startHour, endHour), [startHour, endHour]);

  // ── Professor availability ─────────────────────────────────
  // profSelected: what's drawn on the grid right now (this week)
  // profSaved: the full expanded set shown to students (may include recurring weeks)
  const [profSelected,   setProfSelected]   = useState(new Set());
  const [profSaved,      setProfSaved]      = useState(new Set());

  // ── Recurring settings ─────────────────────────────────────
  const [isRecurring,    setIsRecurring]    = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);

  // ── Student ────────────────────────────────────────────────
  const [studSelected,   setStudSelected]   = useState(new Set());

  // ── Tabs / group view ──────────────────────────────────────
  const [tab,            setTab]            = useState('personal');
  const [activeNames,    setActive]         = useState(new Set(SAMPLE_PARTICIPANTS.map(p => p.name)));
  const [groupKey,       setGroupKey]       = useState(null);
  const [groupMeta,      setGroupMeta]      = useState(null);

  // ── Submissions ────────────────────────────────────────────
  const [submissions,    setSubmissions]    = useState(SAMPLE_SUBMISSIONS);
  const [notifDismissed, setNotifDismissed] = useState(false);
  const pendingCount = submissions.filter(s => s.status === 'pending').length;

  // ── Modals ─────────────────────────────────────────────────
  const [modal,          setModal]          = useState(null);
  const [activeAppt,     setActiveAppt]     = useState(null);
  const [activeSub,      setActiveSub]      = useState(null);

  // ── Handlers ───────────────────────────────────────────────
  function saveProfAvailability() {
    const saved = isRecurring
      ? expandRecurring(profSelected, recurringWeeks)
      : new Set(profSelected);

    setProfSaved(saved);
    // TODO: POST /api/heatmap/availability { slots: [...saved], recurring: isRecurring, recurringWeeks }
    const msg = isRecurring
      ? `${profSelected.size} slots saved and repeated for ${recurringWeeks} week(s).`
      : `${profSelected.size} slots saved for this week only.`;
    alert(msg);
  }

  function submitStudentAvailability() {
    // TODO: POST /api/heatmap/submission { slots: [...studSelected], heatmapId }
    const subject = encodeURIComponent('New availability submission');
    const body    = encodeURIComponent(
      `${user.name} has submitted their availability.\n\nLog in to review and approve.`
    );
    window.open(`mailto:${PROFESSOR.email}?subject=${subject}&body=${body}`);
    alert('Availability submitted! Prof. Vybihal has been notified.');
  }

  function approveSubmission(sub) {
    setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'approved' } : s));
    // TODO: PUT /api/heatmap/submission/:id/approve
  }

  function declineSubmission(sub) {
    setSubmissions(prev => prev.map(s => s.id === sub.id ? { ...s, status: 'declined' } : s));
    // TODO: PUT /api/heatmap/submission/:id/decline
  }

  function handleGroupSelect(key, meta) {
    setGroupKey(key);
    setGroupMeta(meta);
  }

  function handleConfirmSlot() {
    setGroupKey(null);
    setGroupMeta(null);
    setModal(null);
  }

  // ─────────────────────────────────────────────────────────
  return (
    <>
      <Navbar
        logo={logo}
        title="Heatmap Booking"
        onLeftClick={() => navigate('/')}
        user={{ displayName: user.name, role: user.role, initials: userInitials }}
      />

      <div className="heatmap-page">

        {/* ── Demo role switcher ─────────────────────────── */}
        <div style={{ marginBottom: '0.5rem' }}>
          <span style={{ fontSize: 11, color: 'var(--text-faint)', marginRight: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
            Demo — viewing as:
          </span>
          <div className="role-switcher" style={{ display: 'inline-flex' }}>
            <button
              className={`role-button${isProfessor ? ' active' : ''}`}
              onClick={() => { setUser(PROFESSOR); setTab('personal'); }}
            >
              Professor
            </button>
            <button
              className={`role-button${!isProfessor ? ' active' : ''}`}
              onClick={() => { setUser(STUDENT); setTab('personal'); }}
            >
              Student
            </button>
          </div>
        </div>

        {/* ── Page header ───────────────────────────────── */}
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
              : "Select times that work for you from Prof. Vybihal's available slots."}
          </p>
        </div>

        {/* ── Pending submissions banner ─────────────────── */}
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

        {/* ── Mode cards ────────────────────────────────── */}
        <div className="mode-cards">
          <div
            className={`mode-card${tab === 'personal' ? ' active' : ''}`}
            onClick={() => setTab('personal')}
          >
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
            <div
              className={`mode-card${tab === 'submissions' ? ' active' : ''}`}
              onClick={() => setTab('submissions')}
            >
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
          ) : (
            <div
              className={`mode-card${tab === 'group' ? ' active' : ''}`}
              onClick={() => setTab('group')}
            >
              <div className="mode-card-icon student">👥</div>
              <h4>Group view</h4>
              <p>See combined availability of all participants as a heatmap.</p>
            </div>
          )}
        </div>

        {/* ── Date range setup banner ────────────────────── */}
        {!setupDone && (
          <div className="setup-banner">
            <div className="setup-banner-left">
              <h3>Set the date range</h3>
              <p>Choose which week and hours to display on the grid.</p>
            </div>
            <div className="setup-controls">
              <div className="setup-field">
                <label>Start date</label>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} />
              </div>
              <div className="setup-field">
                <label>Days shown</label>
                <select value={numDays} onChange={e => setNumDays(Number(e.target.value))}>
                  <option value={3}>3 days</option>
                  <option value={5}>5 days</option>
                  <option value={7}>7 days</option>
                </select>
              </div>
              <div className="setup-field">
                <label>From</label>
                <select value={startHour} onChange={e => setStartHour(Number(e.target.value))}>
                  {[6,7,8,9,10,11,12].map(h => (
                    <option key={h} value={h}>{h <= 12 ? h : h-12}:00 {h < 12 ? 'AM' : 'PM'}</option>
                  ))}
                </select>
              </div>
              <div className="setup-field">
                <label>To</label>
                <select value={endHour} onChange={e => setEndHour(Number(e.target.value))}>
                  {[13,14,15,16,17,18,19,20,21].map(h => (
                    <option key={h} value={h}>{h <= 12 ? h : h-12}:00 {h < 12 ? 'AM' : 'PM'}</option>
                  ))}
                </select>
              </div>
              <button
                className="button button-primary"
                style={{ alignSelf: 'flex-end' }}
                onClick={() => setSetupDone(true)}
              >
                Apply
              </button>
            </div>
          </div>
        )}

        {setupDone && (
          <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>
              Showing{' '}
              <strong style={{ color: 'var(--text)' }}>
                {days[0]?.date} – {days[days.length - 1]?.date}
              </strong>
              , {startHour <= 12 ? startHour : startHour - 12}:00 {startHour < 12 ? 'AM' : 'PM'}
              {' – '}
              {endHour <= 12 ? endHour : endHour - 12}:00 {endHour < 12 ? 'AM' : 'PM'}
            </span>
            <button className="button button-ghost button-small" onClick={() => setSetupDone(false)}>
              Change
            </button>
          </div>
        )}

        {/* ═══════════════════════════════════════════════════
            PROFESSOR — MY AVAILABILITY
        ═══════════════════════════════════════════════════ */}
        {isProfessor && tab === 'personal' && (
          <>
            <p className="section-label">Click or drag to mark when you're free</p>
            <div className="grid-outer">
              <PersonalGrid
                days={days}
                times={times}
                selected={profSelected}
                setSelected={setProfSelected}
              />
            </div>

            {/* ── Recurring toggle ──────────────────────── */}
            <div style={{
              marginTop: '1.25rem',
              padding: '1rem 1.25rem',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius)',
              display: 'flex',
              alignItems: 'center',
              gap: '1.5rem',
              flexWrap: 'wrap',
            }}>
              {/* One-time option */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="recurrence"
                  checked={!isRecurring}
                  onChange={() => setIsRecurring(false)}
                  style={{ accentColor: 'var(--red)', width: 16, height: 16 }}
                />
                <span>
                  <strong>One-time only</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>
                    — only visible for {days[0]?.date}
                    {numDays > 1 ? ` – ${days[days.length - 1]?.date}` : ''}
                  </span>
                </span>
              </label>

              {/* Recurring option */}
              <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: 13 }}>
                <input
                  type="radio"
                  name="recurrence"
                  checked={isRecurring}
                  onChange={() => setIsRecurring(true)}
                  style={{ accentColor: 'var(--red)', width: 16, height: 16 }}
                />
                <span>
                  <strong>Recurring</strong>
                  <span style={{ color: 'var(--text-muted)', marginLeft: 6 }}>— repeat for</span>
                </span>
              </label>

              {/* Weeks selector — only active when recurring */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <select
                  value={recurringWeeks}
                  onChange={e => setRecurringWeeks(Number(e.target.value))}
                  disabled={!isRecurring}
                  style={{
                    padding: '5px 10px',
                    borderRadius: 6,
                    border: '1.5px solid var(--border-med)',
                    background: isRecurring ? '#fff' : 'var(--surface2)',
                    color: isRecurring ? 'var(--text)' : 'var(--text-faint)',
                    fontSize: 13,
                    cursor: isRecurring ? 'pointer' : 'default',
                    fontFamily: 'inherit',
                  }}
                >
                  {[2,3,4,5,6,8,10,12].map(w => (
                    <option key={w} value={w}>{w} weeks</option>
                  ))}
                </select>
                {isRecurring && (
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
                    until{' '}
                    {(() => {
                      const d = new Date(startDate);
                      d.setDate(d.getDate() + recurringWeeks * 7);
                      return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric' });
                    })()}
                  </span>
                )}
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

        {/* ═══════════════════════════════════════════════════
            PROFESSOR — SUBMISSIONS
        ═══════════════════════════════════════════════════ */}
        {isProfessor && tab === 'submissions' && (
          <>
            <p className="section-label">Student submissions</p>
            {submissions.length === 0 ? (
              <div className="empty-state">
                <div className="empty-state-icon">📭</div>
                <h4>No submissions yet</h4>
                <p>Students will appear here once they submit their availability.</p>
              </div>
            ) : (
              submissions.map(sub => (
                <div key={sub.id} className="submission-card">
                  <div className="submission-info">
                    <h4>{sub.studentName}</h4>
                    <p>{sub.studentEmail} · {sub.slotCount} slots · {sub.submittedAt}</p>
                    <div className="progress-bar-container" style={{ width: 160 }}>
                      <div
                        className="progress-bar-fill"
                        style={{ width: `${Math.min((sub.slotCount / times.length) * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    {sub.status === 'approved' ? (
                      <span className="badge-success">✓ Approved</span>
                    ) : sub.status === 'declined' ? (
                      <span style={{ fontSize: 12, color: '#cc2222' }}>Declined</span>
                    ) : (
                      <>
                        <button
                          className="button button-outline button-small"
                          onClick={() => { setActiveSub(sub); setModal('approve'); }}
                        >
                          Review
                        </button>
                        <a
                          href={`mailto:${sub.studentEmail}?subject=Re: Your availability submission`}
                          className="button button-ghost button-small"
                          style={{ textDecoration: 'none' }}
                        >
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

        {/* ═══════════════════════════════════════════════════
            STUDENT — SELECT SLOTS
        ═══════════════════════════════════════════════════ */}
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
              <ProfAvailGrid
                days={days}
                times={times}
                profSlots={profSaved}
                selected={studSelected}
                setSelected={setStudSelected}
              />
            </div>
            <div className="confirm-bar">
              <button
                className="button button-primary"
                onClick={submitStudentAvailability}
                disabled={studSelected.size === 0}
              >
                Submit availability
              </button>
              <button className="button button-outline" onClick={() => setStudSelected(new Set())}>
                Clear
              </button>
              <span className="selected-info">
                <strong>{studSelected.size}</strong> slot{studSelected.size !== 1 ? 's' : ''} selected
                {profSaved.size === 0 && (
                  <span style={{ color: '#cc8800', marginLeft: 8 }}>
                    (Professor hasn't published slots yet)
                  </span>
                )}
              </span>
            </div>
          </>
        )}

        {/* ═══════════════════════════════════════════════════
            STUDENT — GROUP VIEW
        ═══════════════════════════════════════════════════ */}
        {!isProfessor && tab === 'group' && (
          <>
            <p className="section-label">Participants</p>
            <div className="participants">
              {SAMPLE_PARTICIPANTS.map(p => (
                <div
                  key={p.name}
                  className={`participant-chip${activeNames.has(p.name) ? ' active' : ' inactive'}`}
                  onClick={() => {
                    setActive(prev => {
                      const next = new Set(prev);
                      next.has(p.name) ? next.delete(p.name) : next.add(p.name);
                      return next;
                    });
                  }}
                >
                  <span className="participant-chip-dot" style={{ background: p.color }} />
                  {p.name}
                </div>
              ))}
            </div>
            <HeatmapLegend max={SAMPLE_PARTICIPANTS.filter(p => activeNames.has(p.name)).length} />
            <p className="section-label">Hover cells to see who's free</p>
            <div className="grid-outer">
              <GroupGrid
                days={days}
                times={times}
                participants={SAMPLE_PARTICIPANTS}
                activeNames={activeNames}
                selectedKey={groupKey}
                onSelectKey={handleGroupSelect}
              />
            </div>
            <div className="confirm-bar">
              <button
                className="button button-primary"
                onClick={() => setModal('confirm')}
                disabled={!groupKey}
              >
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

        {/* ─── Modals ───────────────────────────────────── */}
        {modal === 'confirm' && groupMeta && (
          <ConfirmSlotModal
            slot={groupMeta}
            attendees={groupMeta.who}
            onConfirm={handleConfirmSlot}
            onClose={() => setModal(null)}
          />
        )}

        {modal === 'detail' && activeAppt && (
          <SlotDetailModal
            appointment={activeAppt}
            isOwner={isProfessor}
            onDelete={() => setModal('delete')}
            onClose={() => setModal(null)}
          />
        )}

        {modal === 'delete' && activeAppt && (
          <DeleteConfirmModal
            appointment={{ ...activeAppt, notifyEmail: isProfessor ? activeAppt.ownerEmail : PROFESSOR.email }}
            onConfirm={() => setActiveAppt(null)}
            onClose={() => setModal('detail')}
          />
        )}

        {modal === 'invite' && (
          <InviteURLModal
            ownerEmail={user.email}
            eventTitle="Office Hours — Prof. Vybihal"
            onClose={() => setModal(null)}
          />
        )}

        {modal === 'approve' && activeSub && (
          <ApproveSubmissionModal
            submission={activeSub}
            onApprove={approveSubmission}
            onDecline={declineSubmission}
            onClose={() => { setModal(null); setActiveSub(null); }}
          />
        )}

      </div>
    </>
  );
}
