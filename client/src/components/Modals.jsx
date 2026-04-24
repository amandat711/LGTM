/*AMANDA TRAN*/

import React, { useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import CalendarMonthOutlinedIcon from '@mui/icons-material/CalendarMonthOutlined';
import ScheduleOutlinedIcon from '@mui/icons-material/ScheduleOutlined';
import PlaceOutlinedIcon from '@mui/icons-material/PlaceOutlined';
import PublicOutlinedIcon from '@mui/icons-material/PublicOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import NotesOutlinedIcon from '@mui/icons-material/NotesOutlined';
import EventAvailableOutlinedIcon from '@mui/icons-material/EventAvailableOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import EditOutlinedIcon from '@mui/icons-material/EditOutlined';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import MailOutlineOutlinedIcon from '@mui/icons-material/MailOutlineOutlined';
import { formatTime, statusLabel, formatRecurrenceSubtitleLine } from './calendar/calendarUtils';

// ─── Shared shell ─────────────────────────────────────────────
export function Modal({ title, onClose, children, footer, className = '', meta = null, headerActions = null }) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal${className ? ` ${className}` : ''}`}>
        <div className="modal-header">
          <div className="modal-header-main">
            <h3>{title}</h3>
            {meta ? <div className="modal-meta-row">{meta}</div> : null}
          </div>
          <div className="modal-header-actions">
            {headerActions}
            <button className="modal-close" onClick={onClose}>×</button>
          </div>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HelpGuideModal
//    Reusable detailed instructions popup for page-specific help.
// ─────────────────────────────────────────────────────────────
export function HelpGuideModal({ guide, onClose }) {
  const safeGuide = guide || {};

  return (
    <Modal
      title={safeGuide.title || 'How to use this page'}
      onClose={onClose}
      className="help-guide-modal"
      footer={
        <Button variant="contained" onClick={onClose}>
          Got it
        </Button>
      }
    >
      <div className="help-guide">
        {safeGuide.eyebrow && (
          <p className="help-guide-eyebrow">{safeGuide.eyebrow}</p>
        )}
        {safeGuide.intro && (
          <p className="help-guide-intro">{safeGuide.intro}</p>
        )}

        {safeGuide.quickTips?.length > 0 && (
          <div className="help-guide-tips">
            <h4>Quick tips</h4>
            <ul>
              {safeGuide.quickTips.map((tip) => (
                <li key={tip}>{tip}</li>
              ))}
            </ul>
          </div>
        )}

        <div className="help-guide-sections">
          {(safeGuide.sections || []).map((section) => (
            <section key={section.title} className="help-guide-section">
              <h4>{section.title}</h4>
              <ol>
                {section.steps.map((step) => (
                  <li key={step}>{step}</li>
                ))}
              </ol>
            </section>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// ConfirmActionModal
//    Small reusable confirmation popup for destructive or important actions.
// ─────────────────────────────────────────────────────────────
export function ConfirmActionModal({
  title,
  message,
  details = [],
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  danger = false,
  isWorking = false,
  onConfirm,
  onClose,
}) {
  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose} disabled={isWorking}>
            {cancelLabel}
          </Button>
          <Button
            variant={danger ? 'outlined' : 'contained'}
            color={danger ? 'error' : 'primary'}
            onClick={onConfirm}
            disabled={isWorking}
          >
            {isWorking ? 'Working...' : confirmLabel}
          </Button>
        </>
      }
    >
      {message && (
        <p className="modal-description">
          {message}
        </p>
      )}

      {details.length > 0 && (
        <div className="modal-detail-stack">
          {details.map((detail) => (
            <div className="modal-row" key={detail.label}>
              <span className="modal-row-label">{detail.label}</span>
              <span className="modal-row-value">{detail.value}</span>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// 1. ConfirmSlotModal
//    Owner confirms a selected time slot and sends notifications.
// ─────────────────────────────────────────────────────────────
export function ConfirmSlotModal({ slot, attendees, onConfirm, onClose }) {
  const [sent, setSent] = useState(false);

  function handleConfirm() {
    setSent(true);
    // TODO: POST /api/appointments/confirm { slotDay, slotTime, attendeeIds }
    setTimeout(() => { onConfirm(); onClose(); }, 1200);
  }

  return (
    <Modal
      title="Confirm this slot"
      onClose={onClose}
      footer={
        sent ? (
          <span className="badge-success">✓ Notifications sent!</span>
        ) : (
          <>
            <Button variant="text" onClick={onClose}>Cancel</Button>
            <Button variant="contained" onClick={handleConfirm}>
              Send notifications
            </Button>
          </>
        )
      }
    >
      <div className="modal-row">
        <span className="modal-row-label">Day</span>
        <span className="modal-row-value">{slot?.day?.date} ({slot?.day?.short})</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">Time</span>
        <span className="modal-row-value">{slot?.timeLabel}</span>
      </div>
      <div className="modal-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <span className="modal-row-label">Attendees ({attendees?.length})</span>
        <div className="attendee-list">
          {attendees?.map(a => (
            <span key={a.name} className="attendee-tag">
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: a.color, display: 'inline-block' }} />
              {a.name}
            </span>
          ))}
        </div>
      </div>
      <p style={{ marginTop: 14, fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
        All attendees will receive an email notification. This appointment will appear on everyone's dashboard.
      </p>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. SlotDetailModal
//    Click any booked appointment to view details.
// ─────────────────────────────────────────────────────────────
function initialsForName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return `${first}${last}`.toUpperCase();
}

/** Availability = open slot; appointment = has attendees; event = host only (no attendees). */
function slotKindFromAppointment(ap) {
  const safe = ap || {};
  if (safe.type === 'availability') {
    return { key: 'availability', label: 'Availability' };
  }
  const list = Array.isArray(safe.participants) ? safe.participants : [];
  const hasAttendeeInList = list.some((p) => {
    const role = String(p.role || p.participant_role || '').toLowerCase();
    return role === 'attendee';
  });
  const attendeeName = String(safe.attendeeName || '').trim();
  const attendeeEmail = String(safe.attendeeEmail || '').trim();
  const bookedBy = String(safe.bookedBy || '').trim();
  const bookedByLooksLikeSummary = /^\d+\/\d+ booked$/i.test(bookedBy);
  const hasOtherParty =
    (attendeeName && attendeeName !== '—') ||
    !!attendeeEmail ||
    (bookedBy && bookedBy !== '—' && !bookedByLooksLikeSummary);

  if (hasAttendeeInList || hasOtherParty) {
    return { key: 'appointment', label: 'Appointment' };
  }
  return { key: 'event', label: 'Event' };
}

function renderTypeAndCoursePills(ap) {
  const kind = slotKindFromAppointment(ap);
  const courseCode = ap?.course_code ?? ap?.courseCode ?? null;
  return (
    <>
      <span className={`modal-kind-pill modal-kind-pill--${kind.key}`}>{kind.label}</span>
      {courseCode ? (
        <span className="modal-kind-pill modal-kind-pill--course">Course: {courseCode}</span>
      ) : null}
    </>
  );
}

/** Primary destructive action in the detail modal footer (host/professor only). */
function ownerDestructiveFooterLabel(ap) {
  if ((ap || {}).type === 'availability') return 'Delete availability';
  const kind = slotKindFromAppointment(ap).key;
  if (kind === 'event') return 'Delete';
  return 'Cancel appointments';
}

export function SlotDetailModal({
  appointment,
  isOwner,
  onDelete,
  onEdit,
  onClose,
  onUpdateMyStatus,
}) {
  const ap = appointment || {};
  const isAvailability = ap.type === 'availability';
  const slotKind = slotKindFromAppointment(ap);

  const start = ap.startTime ? new Date(ap.startTime) : null;
  const end = ap.endTime ? new Date(ap.endTime) : null;

  const dateLabel = start
    ? start.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
    : ap.day || '—';
  const timeLabel = start && end
    ? `${formatTime(ap.startTime)} \u2013 ${formatTime(ap.endTime)}`
    : ap.time || '—';

  const status = statusLabel(ap.status);
  const statusPillClass = `modal-status-pill ${status.cls || ''}`.trim();

  const createdByName = ap.ownerName || ap.owner || '—';
  const createdByEmail = ap.ownerEmail || '';

  const otherPartyName = isAvailability
    ? (ap.attendeeName || ap.bookedBy || '—')
    : (isOwner ? (ap.attendeeName || ap.bookedBy || '—') : (ap.ownerName || ap.owner || '—'));
  const otherPartyEmail = isAvailability
    ? (ap.attendeeEmail || ap.bookedByEmail || '')
    : (isOwner ? (ap.attendeeEmail || ap.bookedByEmail || '') : (ap.ownerEmail || ''));

  const emailTarget = isAvailability
    ? (otherPartyEmail || '')
    : (isOwner ? (ap.attendeeEmail || '') : (ap.ownerEmail || ''));
  const participantList = Array.isArray(ap.participants) ? ap.participants : [];
  const normalizedParticipants = participantList.length > 0
    ? participantList.map((p) => ({
        userId: p.userId || p.user_id || null,
        name:
          p.name
          || `${p.first_name || ''} ${p.last_name || ''}`.trim()
          || (p.participant_role === 'host' ? createdByName : otherPartyName)
          || 'Unknown user',
        email: p.email || p.mcgill_email || '',
        role: p.role || p.participant_role || 'attendee',
        status:
          p.status
          || p.participant_status
          || (p.response_status === 'accepted'
            ? 'confirmed'
            : p.response_status === 'declined'
              ? 'cancelled'
              : 'pending'),
      }))
    : [
        {
          userId: ap.currentUserId || null,
          name: createdByName || 'Host',
          email: createdByEmail || '',
          role: 'host',
          status: 'confirmed',
        },
        ...((otherPartyName && otherPartyName !== '—')
          ? [{
              userId: null,
              name: otherPartyName,
              email: otherPartyEmail || '',
              role: 'attendee',
              status: ap.status || 'pending',
            }]
          : []),
      ];
  const canUpdateMyStatus = !isAvailability && typeof onUpdateMyStatus === 'function';
  const ownerPending = isOwner && ap.myStatus === 'pending';

  const recurrenceSubtitle = formatRecurrenceSubtitleLine({
    recurrence_rule: ap.recurrence_rule,
    recurrence_group_id: ap.recurrence_group_id,
  });
  const locationValue = ap.location && String(ap.location).trim() ? ap.location : 'TBD';
  const detailText = ap.description || ap.notes || '';
  const normalizedVisibility = ap.visibility ? String(ap.visibility) : '';
  const capacityNumber = Number(ap.capacity);
  const hasCapacity = Number.isFinite(capacityNumber) && capacityNumber >= 1;

  return (
    <Modal
      title={ap.title || 'Appointment details'}
      onClose={onClose}
      meta={renderTypeAndCoursePills(ap)}
      headerActions={
        <>
          {isOwner && onEdit ? (
            <Tooltip title={slotKind.key === 'availability' ? 'Edit availability' : 'Edit event'}>
              <IconButton size="small" onClick={onEdit} aria-label="Edit">
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {isOwner ? (
            <Tooltip title={ownerDestructiveFooterLabel(ap)}>
              <IconButton size="small" onClick={onDelete} aria-label="Delete">
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          <Tooltip title={`Email ${isAvailability ? 'student' : isOwner ? 'attendee' : 'owner'}`}>
            <IconButton
              size="small"
              component="a"
              href={`mailto:${emailTarget}?subject=Re:%20${encodeURIComponent(ap.title || 'Appointment')}`}
              aria-label="Email"
            >
              <MailOutlineOutlinedIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </>
      }
    >
      <div className="modal-titleblock">
        <div className="modal-titleblock-main">
          <div className="modal-subtitle">
            <span className="modal-subtitle-item">
              <CalendarMonthOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
              {dateLabel}
            </span>
            <span className="modal-subtitle-sep">•</span>
            <span className="modal-subtitle-item">
              <ScheduleOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
              {timeLabel}
            </span>
          </div>
          {recurrenceSubtitle ? (
            <div className="modal-recurrence-line">{recurrenceSubtitle}</div>
          ) : null}
        </div>
        <div className="modal-titleblock-right">
          <span className={statusPillClass}>{status.label}</span>
        </div>
      </div>
      {ownerPending && (
        <p className="modal-description" style={{ marginTop: -6, marginBottom: 10 }}>
          Action required: this booking request is waiting for your response.
        </p>
      )}

      <div className="modal-section">
        <div className="modal-section-title">Details</div>
        <div className="modal-detail-stack">
          <div className="modal-row modal-row-multiline">
            <span className="modal-row-label modal-row-label-with-icon">
              <EventAvailableOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
              Title
            </span>
            <span className="modal-row-value modal-row-value-block">{ap.title || '—'}</span>
          </div>

          <div className="modal-row">
            <span className="modal-row-label modal-row-label-with-icon">
              <PlaceOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
              Location
            </span>
            <span className="modal-row-value">{locationValue}</span>
          </div>

          {detailText && (
            <div className="modal-row modal-row-multiline">
              <span className="modal-row-label modal-row-label-with-icon">
                <NotesOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
                Description
              </span>
              <span className="modal-row-value modal-row-value-block">{detailText}</span>
            </div>
          )}

          {isAvailability && (
            <>
              <div className="modal-row">
                <span className="modal-row-label modal-row-label-with-icon">
                  <PublicOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
                  Visibility
                </span>
                <span className="modal-row-value">{ap.visibility || '—'}</span>
              </div>
              <div className="modal-row">
                <span className="modal-row-label modal-row-label-with-icon">
                  <GroupsOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
                  Capacity
                </span>
                <span className="modal-row-value">
                  {Number.isFinite(Number(ap.capacity)) ? ap.capacity : '—'}
                </span>
              </div>
              <div className="modal-row">
                <span className="modal-row-label">Booked</span>
                <span className="modal-row-value">
                  {Number.isFinite(Number(ap.bookedCount)) && Number.isFinite(Number(ap.capacity))
                    ? `${ap.bookedCount}/${ap.capacity}`
                    : (ap.attendeeName || ap.bookedBy || '—')}
                </span>
              </div>
            </>
          )}

          {!isAvailability && (
            <>
              <div className="modal-row">
                <span className="modal-row-label modal-row-label-with-icon">
                  <PublicOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
                  Visibility
                </span>
                <span className="modal-row-value">{normalizedVisibility || '—'}</span>
              </div>
              <div className="modal-row">
                <span className="modal-row-label modal-row-label-with-icon">
                  <GroupsOutlinedIcon className="modal-inline-icon" fontSize="inherit" />
                  Capacity
                </span>
                <span className="modal-row-value">{hasCapacity ? capacityNumber : '—'}</span>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="modal-section">
        <div className="modal-section-title">People</div>
        {normalizedParticipants.length > 0 ? (
          <div className="participant-list">
            {normalizedParticipants.map((p, index) => {
              const status = p.status || p.participant_status || 'pending';
              const role = p.role || p.participant_role || 'attendee';
              const userId = p.userId || p.user_id;
              const isCurrentUser = Number(userId) === Number(ap.currentUserId);
              return (
                <div key={`${p.userId || p.user_id || 'na'}-${p.email || p.mcgill_email || index}`} className="participant-row">
                  <div className="participant-avatar-wrap">
                    <span className="participant-avatar">{initialsForName(p.name)}</span>
                    <span className={`participant-status-dot participant-status-${status}`} />
                  </div>
                  <div className="participant-meta">
                    <span className="participant-name">
                      {p.name}
                      {role === 'host' && <span className="participant-role-badge">Host</span>}
                    </span>
                    <span className="participant-email">{p.email}</span>
                  </div>
                  <div className="participant-status-actions">
                    {!(canUpdateMyStatus && isCurrentUser) && (
                      <span className={`appointment-status-pill ${
                        status === 'confirmed'
                          ? 'status-confirmed'
                          : status === 'cancelled'
                            ? 'status-cancelled'
                            : 'status-pending'
                      }`}>
                        {status}
                      </span>
                    )}
                    {canUpdateMyStatus && isCurrentUser && (
                      <div className="participant-status-edit-wrap">
                        <CheckCircleOutlineOutlinedIcon className="modal-inline-icon participant-status-icon" fontSize="inherit" />
                        <select
                          className="participant-status-select"
                          aria-label="Change your status"
                          value={status}
                          onChange={(e) => onUpdateMyStatus(e.target.value)}
                        >
                          <option value="pending">pending</option>
                          <option value="confirmed">confirmed</option>
                          <option value="cancelled">cancelled</option>
                        </select>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="modal-detail-stack">
            <div className="modal-row">
              <span className="modal-row-label">Created by</span>
              <span className="modal-row-value">
                {createdByEmail ? `${createdByName} (${createdByEmail})` : createdByName}
              </span>
            </div>
            <div className="modal-row">
              <span className="modal-row-label">{isAvailability ? 'Booked by' : isOwner ? 'Booked by' : 'Owner'}</span>
              <span className="modal-row-value">
                {otherPartyEmail ? `${otherPartyName} (${otherPartyEmail})` : otherPartyName}
              </span>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. DeleteConfirmModal
//    Confirms cancellation and opens a mailto: notification.
// ─────────────────────────────────────────────────────────────
export function DeleteConfirmModal({ appointment, onConfirm, onClose }) {
  const ap = appointment || {};
  const isAvailability = ap.type === 'availability';
  const slotKind = isAvailability ? { key: 'availability', label: 'Availability' } : slotKindFromAppointment(ap);

  async function handleDelete() {
    if (!isAvailability && ap.notifyEmail) {
      const isEvent = slotKind.key === 'event';
      const subject = encodeURIComponent(
        isEvent ? `Event removed: ${ap.title}` : `Appointment cancelled: ${ap.title}`
      );
      const body = encodeURIComponent(
        isEvent
          ? `Hi,\n\nThe event "${ap.title}" on ${ap.day} at ${ap.time} has been removed from the calendar.\n\nApologies for any inconvenience.`
          : `Hi,\n\nThe appointment "${ap.title}" on ${ap.day} at ${ap.time} has been cancelled.\n\nApologies for any inconvenience.`
      );
      window.open(`mailto:${ap.notifyEmail}?subject=${subject}&body=${body}`);
    }

    const shouldClose = await onConfirm();
    if (shouldClose !== false) {
      onClose();
    }
  }

  const confirmTitle = isAvailability
    ? 'Delete this availability?'
    : slotKind.key === 'event'
      ? 'Delete this event?'
      : 'Cancel appointments?';

  const confirmDangerLabel = isAvailability
    ? 'Yes, delete availability'
    : slotKind.key === 'event'
      ? 'Yes, delete'
      : 'Yes, cancel appointments';

  const confirmBody = isAvailability
    ? 'This will permanently delete the availability slot from your calendar.'
    : slotKind.key === 'event'
      ? 'This will permanently remove this event from your calendar.'
      : 'This will cancel the appointment(s) and open your email client to notify the other party.';

  const deleteRecurrenceSubtitle = formatRecurrenceSubtitleLine({
    recurrence_rule: ap.recurrence_rule,
    recurrence_group_id: ap.recurrence_group_id,
  });

  return (
    <Modal
      title={confirmTitle}
      onClose={onClose}
      meta={renderTypeAndCoursePills(ap)}
      footer={
        <>
          <Button variant="text" onClick={onClose}>Keep it</Button>
          <Button variant="outlined" color="error" onClick={handleDelete}>
            {confirmDangerLabel}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
        {confirmBody}
      </p>
      {deleteRecurrenceSubtitle ? (
        <div className="modal-recurrence-line modal-recurrence-line--spaced">{deleteRecurrenceSubtitle}</div>
      ) : null}
      <div className="modal-row">
        <span className="modal-row-label">{isAvailability ? 'Availability' : slotKind.label}</span>
        <span className="modal-row-value">{ap.title}</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">Date &amp; time</span>
        <span className="modal-row-value">{ap.day} at {ap.time}</span>
      </div>
      {!isAvailability && (
        <div className="modal-row">
          <span className="modal-row-label">Notify</span>
          <span className="modal-row-value">{ap.notifyEmail}</span>
        </div>
      )}
    </Modal>
  );
}

export function RecurrenceScopeModal({
  actionLabel = 'update',
  onSelect,
  onClose,
  recurrenceSubtitle = '',
}) {
  return (
    <Modal
      title={`${actionLabel === 'delete' ? 'Delete' : 'Edit'} recurring event`}
      onClose={onClose}
      footer={
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {recurrenceSubtitle ? (
        <div className="modal-recurrence-line modal-recurrence-line--spaced">{recurrenceSubtitle}</div>
      ) : null}
      <div className="modal-detail-stack">
        <Button
          type="button"
          variant="outlined"
          onClick={() => onSelect('single')}
          sx={{ width: '100%', justifyContent: 'flex-start' }}
        >
          This event
        </Button>
        <Button
          type="button"
          variant="outlined"
          onClick={() => onSelect('this_and_following')}
          sx={{ width: '100%', justifyContent: 'flex-start' }}
        >
          This and following events
        </Button>
        <Button
          type="button"
          variant="outlined"
          onClick={() => onSelect('all')}
          sx={{ width: '100%', justifyContent: 'flex-start' }}
        >
          All events
        </Button>
      </div>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. InviteURLModal
//    Generates a shareable booking link for owners.
// ─────────────────────────────────────────────────────────────
export function InviteURLModal({ ownerEmail, eventTitle, inviteURL, onClose }) {
  const [copied, setCopied] = useState(false);
  const shareURL = inviteURL || `${window.location.origin}/heatmap`;

  function handleCopy() {
    navigator.clipboard.writeText(shareURL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal
      title="Share your booking page"
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>Done</Button>
          <Button variant="contained" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>
        Share this link so students can open the heatmap, mark their availability, and send it back to you.
      </p>
      <p style={{ fontSize: 11, color: '#aaa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        Booking page for
      </p>
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{eventTitle || ownerEmail}</p>
      <div className="copy-row">
        <input className="copy-input" readOnly value={shareURL} />
        <Button size="small" variant="outlined" onClick={handleCopy} sx={{ whiteSpace: 'nowrap' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </Button>
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: '#bbb' }}>
        Tip: paste this into your course slides or email signature.
      </p>
    </Modal>
  );
}

// ─────────────────────────────────────────────────────────────
// 5. ApproveSubmissionModal
//    Professor reviews a student's availability submission.
// ─────────────────────────────────────────────────────────────
function formatSlotLabel(slot) {
  if (!slot?.startTime || !slot?.endTime) return 'Unknown time';

  const start = new Date(slot.startTime);
  const end = new Date(slot.endTime);

  return `${start.toLocaleDateString('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })} · ${start.toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  })} - ${end.toLocaleTimeString('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  })}`;
}

export function ApproveSubmissionModal({ submission, onApprove, onDecline, onClose }) {
  const s = submission || {};
  const slotOptions = useMemo(() => s.slots || [], [s.slots]);
  const [selectedSlotId, setSelectedSlotId] = useState(slotOptions[0]?.id || null);

  useEffect(() => {
    setSelectedSlotId(slotOptions[0]?.id || null);
  }, [slotOptions]);

  const selectedSlot = slotOptions.find((slot) => slot.id === selectedSlotId) || slotOptions[0] || null;

  return (
    <Modal
      title="Review availability submission"
      onClose={onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose}>Later</Button>
          <Button
            size="small"
            variant="outlined"
            color="error"
            onClick={() => { onDecline(s); onClose(); }}
          >
            Decline
          </Button>
          <Button
            size="small"
            variant="contained"
            onClick={() => {
              onApprove(s, selectedSlot);
              onClose();
            }}
            disabled={!selectedSlot}
          >
            Approve
          </Button>
        </>
      }
    >
      <div className="modal-row">
        <span className="modal-row-label">Student</span>
        <span className="modal-row-value">{s.studentName}</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">Email</span>
        <span className="modal-row-value">{s.studentEmail}</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">Slots selected</span>
        <span className="modal-row-value">{s.slotCount} slot{s.slotCount !== 1 ? 's' : ''}</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">Submitted</span>
        <span className="modal-row-value">{s.submittedAt}</span>
      </div>
      <div className="modal-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 8 }}>
        <span className="modal-row-label">Choose the booked slot</span>
        <div style={{ width: '100%', display: 'grid', gap: 8 }}>
          {slotOptions.length === 0 ? (
            <span className="modal-row-value">No submitted slots</span>
          ) : (
            slotOptions.map((slot) => (
              <label
                key={slot.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '8px 10px',
                  borderRadius: 8,
                  border: `1px solid ${selectedSlotId === slot.id ? '#E31429' : '#ddd'}`,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="approved-slot"
                  checked={selectedSlotId === slot.id}
                  onChange={() => setSelectedSlotId(slot.id)}
                />
                <span>{formatSlotLabel(slot)}</span>
              </label>
            ))
          )}
        </div>
      </div>
      <p style={{ marginTop: 14, fontSize: 12, color: '#aaa', lineHeight: 1.5 }}>
        Approving will confirm the selected slot, create the appointment, and notify the student by email.
        Declining will free up their selected slots.
      </p>
    </Modal>
  );
}
