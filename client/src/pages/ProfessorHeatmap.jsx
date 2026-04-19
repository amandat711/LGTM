/*AMANDA TRAN*/
// React state/effect hooks plus router helpers for route-based heatmap pages.
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
// Shared heatmap styling for the setup panel, tabs, grids, and modals.
import '../styles/Heatmap.css';
// Shared page chrome and session helpers.
import logo from '../assets/logo1.png';
import Navbar from '../components/Navbar';
import useAppShellSession from '../hooks/useAppShellSession';
import { sessionUserToNavUser } from '../auth/authUtils';
// Grid components used by professor view: personal availability and group heatmap.
import { PersonalGrid, GroupGrid, HeatmapLegend } from '../components/HeatmapGrid';
// Reusable modal components for confirmations, sharing, and submission review.
import {
  ConfirmSlotModal,
  DeleteConfirmModal,
  InviteURLModal,
  ApproveSubmissionModal,
  SlotDetailModal,
} from '../components/Modals';
// Backend helpers for loading, saving, approving, and booking from heatmaps.
import { createHeatmap, createHeatmapAppointment, getHeatmap, saveHeatmapSubmission, updateHeatmapSubmissionStatus } from '../api/heatmaps';
// Calendar-grid helpers that produce the visible day and time labels.
import { generateDays, generateTimes } from '../utils/generateDays';
// Shared conversion helpers used by both professor and student heatmap pages.
import {
  PARTICIPANT_COLORS,
  buildDashboardPath,
  buildHeatmapPath,
  deriveRangeFromSlots,
  expandRecurring,
  keyToDateRange,
  keysToSlots,
  mapSubmissionSlotsToKeys,
  toLocalDateTime,
} from '../utils/heatmapPageUtils';

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

  // Controls which dates and hours are visible in the heatmap grid.
  const [startDate, setStartDate] = useState('2026-04-07');
  const [startHour, setStartHour] = useState(8);
  const [endHour, setEndHour] = useState(17);
  const [numDays, setNumDays] = useState(5);
  const [setupDone, setSetupDone] = useState(false);
  const days = useMemo(() => generateDays(startDate, numDays), [startDate, numDays]);
  const times = useMemo(() => generateTimes(startHour, endHour), [startHour, endHour]);

  // Professor availability state and recurrence options.
  const [profSelected, setProfSelected] = useState(new Set());
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringWeeks, setRecurringWeeks] = useState(4);
  // UI state: active tab, active group selection, notification, and modals.
  const [tab, setTab] = useState('personal');
  const [activeNames, setActive] = useState(new Set());
  const [groupKey, setGroupKey] = useState(null);
  const [groupMeta, setGroupMeta] = useState(null);
  const [notifDismissed, setNotifDismissed] = useState(false);
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);
  const [activeSub, setActiveSub] = useState(null);
  // Loaded heatmap bundle and basic page status.
  const [heatmapBundle, setHeatmapBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Pull apart the bundle so render logic can stay readable below.
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

  // Load the heatmap. If this is /new, create it first and redirect to the real ID route.
  useEffect(() => {
    let active = true;

    async function loadHeatmapData() {
      setLoading(true);
      setError('');

      try {
        let bundle = null;

        if (isNewHeatmapRoute) {
          if (!user?.id) return;

          // New heatmaps start with simple default metadata, then the professor can share the link.
          bundle = await createHeatmap({
            created_by: user.id,
            hm_title: 'Office Hours Heatmap',
            hm_description: 'Shared availability collection for bookings',
            visibility: 'public',
            time_zone: 'America/Toronto',
          });

          navigate(buildHeatmapPath('professor', bundle.heatmap.id), { replace: true });
        } else {
          bundle = await getHeatmap(eventId);
        }

        if (!active) return;

        setHeatmapBundle(bundle);

        // Existing heatmaps may have saved slots, so fit the grid to those slots automatically.
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
  }, [eventId, isNewHeatmapRoute, navigate, user?.id]);

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

  // Approving one student submission creates a real appointment for the selected slot.
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

  // Declining keeps the submission record but marks it as not accepted.
  async function declineSubmission(sub) {
    try {
      const bundle = await updateHeatmapSubmissionStatus(sub.id, 'declined');
      setHeatmapBundle(bundle);
    } catch (err) {
      setError(err.message || 'Unable to decline submission.');
    }
  }

  // Confirming a group slot creates one appointment with everyone free in that selected cell.
  async function handleConfirmSlot() {
    try {
      const startEnd = keyToDateRange(groupKey, startHour);
      const response = await createHeatmapAppointment(currentHeatmapId, {
        host_user_id: heatmap.createdBy,
        attendee_user_ids: groupMeta.who.map((participant) => participant.userId),
        start_time: toLocalDateTime(startEnd.start),
        end_time: toLocalDateTime(startEnd.end),
        ap_title: 'Group heatmap booking',
        ap_description: 'Created from heatmap group confirmation',
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
      {/* Shared top navbar for returning to dashboard and showing professor identity. */}
      <Navbar
        logo={logo}
        title="Heatmap Booking"
        user={user ? { displayName: user.name, role: user.role, initials: userInitials } : undefined}
        actions={[{ label: 'Back to dashboard', onClick: () => navigate(buildDashboardPath(user)) }]}
      />

      <div className="heatmap-page">
        {/* Page intro explains what the professor is doing on this screen. */}
        <div className="page-header">
          <div className="page-label">Professor Dashboard</div>
          <h1 className="page-title">Set your availability</h1>
          <p className="page-subtitle">Mark when you're free. Choose whether slots repeat weekly.</p>
        </div>

        {/* Lightweight page feedback while data loads or if a backend call fails. */}
        {loading && <p style={{ color: '#666', marginBottom: 16 }}>Loading heatmap...</p>}
        {error && <p style={{ color: '#cc2222', marginBottom: 16 }}>{error}</p>}

        {/* Banner appears when students have submitted availability for review. */}
        {pendingCount > 0 && !notifDismissed && (
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

        {/* Top mode cards switch between professor availability, submissions, and group heatmap. */}
        <div className="mode-cards">
          <div className={`mode-card${tab === 'personal' ? ' active' : ''}`} onClick={() => setTab('personal')}>
            <div className="mode-card-icon professor"></div>
            <h4>My availability</h4>
            <p>Click and drag to mark times you're free. Set recurring or one-time.</p>
          </div>

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

        {/* Personal tab: professor selects and saves their own available time slots. */}
        {tab === 'personal' && (
          <>
            <p className="section-label">Click or drag to mark when you're free</p>
            <div className="grid-outer">
              <PersonalGrid days={days} times={times} selected={profSelected} setSelected={setProfSelected} />
            </div>

            {/* Recurrence controls decide whether selected slots apply once or repeat weekly. */}
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

        {/* Submissions tab: professor reviews each student's submitted availability. */}
        {tab === 'submissions' && (
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
                // One card per student submission, with status and review actions.
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

        {/* Group tab: professor sees all student availability as one combined heatmap. */}
        {tab === 'group' && (
          <>
            <p className="section-label">All respondents ({participants.length})</p>
            {participants.length === 0 ? (
              <div className="empty-state">
                <h4>No student submissions yet</h4>
                <p>Once students submit their availability, you'll see a heatmap here. Darker cells mean more students are free at that time.</p>
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
                  {/* Selecting a group cell stores the slot and participant metadata for confirmation. */}
                  <GroupGrid days={days} times={times} participants={participants} activeNames={activeNames} selectedKey={groupKey} onSelectKey={(key, meta) => { setGroupKey(key); setGroupMeta(meta); }} />
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

        {/* Modal for confirming one group booking slot. */}
        {modal === 'confirm' && groupMeta && (
          <ConfirmSlotModal slot={groupMeta} attendees={groupMeta.who} onConfirm={handleConfirmSlot} onClose={() => setModal(null)} />
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
            onClose={() => setModal(null)}
          />
        )}

        {/* Submission review modal lets the professor approve or decline a student's response. */}
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
