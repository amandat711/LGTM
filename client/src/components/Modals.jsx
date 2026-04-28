/* AMANDA TRAN (30% contribution)*/
// SHIRLEY DING, 3.0% contribution

// JOCELYNE LI (47% estimated contribution) => Feature implementation, integration work, and quality refinements
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
import {
  formatTime,
  statusLabel,
  formatRecurrenceSubtitleLine,
  slotKindFromAppointment,
} from './calendar/calendarUtils';

// One modal frame shared by all of the popups below.
export function Modal({ title, onClose, children, footer, className = '', meta = null, headerActions = null }) {
  return (
    <div
      className="modal-overlay"
      // Only close when the backdrop itself is clicked, not when a user clicks inside the modal.
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

// Shows the page-specific help text from helpGuides.js.
export function HelpGuideModal({ guide, onClose }) {
  // Some pages may open help before the guide is loaded, so keep the modal safe by default.
  const safeGuide = guide || {};

  return (
    <Modal
      title={safeGuide.title || 'How to use this page'}
      onClose={onClose}
      className="help-guide-modal"
      footer={
        <button type="button" className="button button-primary" onClick={onClose}>
          Got it
        </button>
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

// Small confirmation dialog used when an action needs one last check.
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
      {/* Details are optional so the same modal can work for short and detailed confirmations. */}
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

// Final professor step after choosing a heatmap slot.
export function ConfirmSlotModal({ slot, attendees, onConfirm, onClose }) {
  const [submitting, setSubmitting] = useState(false);

  async function handleConfirm() {
    // Prevent double-clicks from creating duplicate appointments.
    if (submitting) return;
    setSubmitting(true);
    try {
      await Promise.resolve(onConfirm());
    } catch {
      // The heatmap page owns the user-facing error message.
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Modal
      title="Confirm this slot"
      onClose={submitting ? () => { } : onClose}
      footer={
        <>
          <Button variant="text" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button variant="contained" onClick={handleConfirm} disabled={submitting}>
            {submitting ? 'Confirming…' : 'Confirm'}
          </Button>
        </>
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
        When you confirm, the appointment is created and everyone listed above receives a confirmation email. It
        will also show on each person&apos;s dashboard.
      </p>
    </Modal>
  );
}


// Builds the little initials avatar shown beside each participant.
function initialsForName(name) {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  const first = parts[0][0] || '';
  const last = parts.length > 1 ? parts[parts.length - 1][0] || '' : '';
  return `${first}${last}`.toUpperCase();
}

function renderTypeAndCoursePills(ap) {
  // The detail modal can represent an appointment, event, availability, or course-linked item.
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

// The delete button means different things depending on the calendar item.
function ownerDestructiveFooterLabel(ap) {
  if ((ap || {}).type === 'availability') return 'Delete availability';
  const kind = slotKindFromAppointment(ap).key;
  if (kind === 'event') return 'Delete';
  return 'Cancel appointments';
}

// Main detail popup for appointments, events, and availability blocks.
export function SlotDetailModal({
  appointment,
  isOwner,
  onDelete,
  onEdit,
  onClose,
  onUpdateMyStatus,
  onDismissCancelled,
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

  // Newer API responses include participants. Older calendar rows only have
  // owner/attendee fields, so this fallback keeps the modal working for both.
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

  // These flags control which actions are actually safe to show for the current user/item.
  const canUpdateMyStatus = !isAvailability && typeof onUpdateMyStatus === 'function';
  const ownerPending = isOwner && ap.myStatus === 'pending';
  const canDismissCancelled = !isAvailability && ap.status === 'cancelled' && typeof onDismissCancelled === 'function';

  // Recurring slots get a small hint so users know what series they are touching.
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
          {/* Owners can edit open availability and host-only events from the details modal. */}
          {isOwner && onEdit ? (
            <Tooltip title={slotKind.key === 'availability' ? 'Edit availability' : 'Edit event'}>
              <IconButton size="small" onClick={onEdit} aria-label="Edit">
                <EditOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {isOwner && ap.status !== 'cancelled' ? (
            <Tooltip title={ownerDestructiveFooterLabel(ap)}>
              <IconButton size="small" onClick={onDelete} aria-label="Delete">
                <DeleteOutlineOutlinedIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : null}
          {/* Cancelled items are kept visible until each user dismisses them. */}
          {canDismissCancelled ? (
            <Tooltip title="Dismiss cancelled item">
              <IconButton size="small" onClick={onDismissCancelled} aria-label="Dismiss cancelled item">
                <CheckCircleOutlineOutlinedIcon fontSize="small" />
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
                      <span className={`appointment-status-pill ${status === 'confirmed'
                        ? 'status-confirmed'
                        : status === 'cancelled'
                          ? 'status-cancelled'
                          : 'status-pending'
                        }`}>
                        {status}
                      </span>
                    )}
                    {canUpdateMyStatus && isCurrentUser && (
                      // Only the logged-in participant gets the status dropdown.
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

// Confirmation for deleting availability, deleting an event, or cancelling a booking.
export function DeleteConfirmModal({ appointment, onConfirm, onClose }) {
  const ap = appointment || {};
  const isAvailability = ap.type === 'availability';
  const slotKind = isAvailability ? { key: 'availability', label: 'Availability' } : slotKindFromAppointment(ap);

  async function handleDelete() {
    // Parents can return false when another modal, like recurrence scope, needs to stay open.
    const shouldClose = await onConfirm();
    if (shouldClose !== false) {
      onClose();
    }
  }

  const confirmTitle = isAvailability
    ? 'Delete this availability?'
    : slotKind.key === 'event'
      ? 'Delete this event?'
      : 'Cancel this appointment?';

  const confirmDangerLabel = isAvailability
    ? 'Yes, delete availability'
    : slotKind.key === 'event'
      ? 'Yes, delete'
      : 'Yes, cancel appointment';

  const confirmBody = isAvailability
    ? 'This will permanently delete the availability slot from your calendar.'
    : slotKind.key === 'event'
      ? 'This will permanently remove this event from your calendar.'
      : 'This will mark the appointment as cancelled for everyone. The other party will see the cancelled slot until they dismiss it, and they will receive an email notification.';

  const deleteRecurrenceSubtitle = formatRecurrenceSubtitleLine({
    recurrence_rule: ap.recurrence_rule,
    recurrence_group_id: ap.recurrence_group_id,
  });

  const startDel = ap.startTime ? new Date(ap.startTime) : null;
  const endDel = ap.endTime ? new Date(ap.endTime) : null;
  // Older callers may pass plain day/time text, so this falls back when ISO times are missing.
  const deleteDateTimeLabel =
    startDel && !Number.isNaN(startDel.getTime())
      ? endDel && !Number.isNaN(endDel.getTime())
        ? `${startDel.toLocaleDateString('en-CA', {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })} · ${formatTime(ap.startTime)} – ${formatTime(ap.endTime)}`
        : startDel.toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' })
      : [typeof ap.day === 'string' || typeof ap.day === 'number' ? String(ap.day) : '', typeof ap.time === 'string' || typeof ap.time === 'number' ? String(ap.time) : '']
        .filter(Boolean)
        .join(' at ') || '—';

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
        <span className="modal-row-value">{deleteDateTimeLabel}</span>
      </div>
      {!isAvailability && ap.notifyEmail ? (
        <div className="modal-row">
          <span className="modal-row-label">Email to</span>
          <span className="modal-row-value">{ap.notifyEmail}</span>
        </div>
      ) : null}
    </Modal>
  );
}

// Lets the user choose how much of a recurring series should be changed.
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
      className="modal--recurrence-scope"
      footer={
        <Button variant="text" onClick={onClose}>
          Cancel
        </Button>
      }
    >
      {recurrenceSubtitle ? (
        <div className="modal-recurrence-line modal-recurrence-line--spaced">{recurrenceSubtitle}</div>
      ) : null}
      <div className="modal-detail-stack modal-detail-stack--recurrence-scope">
        {/* These values match the recurrence_scope options expected by the backend. */}
        <Button type="button" variant="outlined" onClick={() => onSelect('single')}>
          This event
        </Button>
        <Button type="button" variant="outlined" onClick={() => onSelect('this_and_following')}>
          This and following events
        </Button>
        <Button type="button" variant="outlined" onClick={() => onSelect('all')}>
          All events
        </Button>
      </div>
    </Modal>
  );
}

// Shareable link modal for sending a heatmap to students.
export function InviteURLModal({ ownerEmail, eventTitle, inviteURL, onClose }) {
  const [copied, setCopied] = useState(false);
  // Default keeps the modal usable in local/demo mode even if no URL was generated yet.
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
          {/* <Button variant="text" onClick={onClose}>Done</Button> */}
          <Button variant="contained" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </Button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>
        Share this link so students can open the heatmap, mark their availability, and send it back to you.
      </p>
      <p style={{ fontSize: 14, color: '#aaa', marginBottom: 4 }}>
        Booking page for
      </p>
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{eventTitle || ownerEmail}</p>
      <div className="copy-row">
        <input className="copy-input" readOnly value={shareURL} />
        {/* <Button size="small" variant="outlined" onClick={handleCopy} sx={{ whiteSpace: 'nowrap' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </Button> */}
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: '#bbb' }}>
        Tip: paste this into your course slides or email signature.
      </p>
    </Modal>
  );
}

// Formats a student's submitted slot into the compact radio-button label.
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

  // If the professor opens a different student's submission, reset to that submission's first slot.
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
