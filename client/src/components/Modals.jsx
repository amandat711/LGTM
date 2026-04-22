/* AMANDA TRAN */
// Shared modal components used across dashboards, booking flows, and heatmap pages.

import React, { useEffect, useMemo, useState } from 'react';
import { formatTime, statusLabel } from './calendar/calendarUtils';

// One shell for all popups so headers, close behavior, and footers stay consistent.
function Modal({ title, onClose, children, footer, className = '' }) {
  return (
    // Clicking the dimmed background closes the modal; clicking inside the modal does not.
    <div
      className="modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className={`modal${className ? ` ${className}` : ''}`}>
        <div className="modal-header">
          <h3>{title}</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  );
}

// Page help modal. The guide content comes from data/helpGuides.js.
export function HelpGuideModal({ guide, onClose }) {
  // Keep the modal usable even if a page forgets to pass guide content.
  const safeGuide = guide || {};

  return (
    <Modal
      title={safeGuide.title || 'How to use this page'}
      onClose={onClose}
      className="help-guide-modal"
      footer={
        <button className="button button-primary" onClick={onClose}>
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
          // Short reminders first, before the longer step-by-step sections.
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

// Generic confirmation modal for actions that deserve a pause before they happen.
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
          <button className="button button-ghost" onClick={onClose} disabled={isWorking}>
            {cancelLabel}
          </button>
          <button
            className={`button ${danger ? 'button-danger' : 'button-primary'}`}
            onClick={onConfirm}
            disabled={isWorking}
          >
            {isWorking ? 'Working...' : confirmLabel}
          </button>
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
            // Detail rows make destructive actions feel less ambiguous.
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

// Used when a professor confirms a heatmap slot and wants to notify attendees.
export function ConfirmSlotModal({ slot, attendees, onConfirm, onClose }) {
  const [sent, setSent] = useState(false);

  function handleConfirm() {
    // Show immediate feedback before the parent creates/navigates away from the appointment.
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
            <button className="button button-ghost" onClick={onClose}>Cancel</button>
            <button className="button button-primary" onClick={handleConfirm}>
              Send notifications
            </button>
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
        {/* Attendee tags echo the colors from the heatmap participant chips. */}
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

export function SlotDetailModal({ appointment, isOwner, onDelete, onEdit, onClose }) {
  const ap = appointment || {};
  const isAvailability = ap.type === 'availability';

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

  return (
    <Modal
      title={ap.title || 'Appointment details'}
      onClose={onClose}
      footer={
        <>
          {isOwner && onEdit && (
            <button className="button button-outline button-small" onClick={onEdit}>
              Edit availability
            </button>
          )}
          {isOwner && (
            <button className="button button-danger button-small" onClick={onDelete}>
              {isAvailability ? 'Delete availability' : 'Cancel booking'}
            </button>
          )}
          <a
            href={`mailto:${emailTarget}?subject=Re:%20${encodeURIComponent(ap.title || 'Appointment')}`}
            className="button button-outline button-small"
            style={{ textDecoration: 'none' }}
          >
            Email {isAvailability ? 'student' : isOwner ? 'attendee' : 'owner'}
          </a>
          <button className="button button-ghost" onClick={onClose}>Close</button>
        </>
      }
    >
      <div className="modal-titleblock">
        <div className="modal-subtitle">
          <span>{dateLabel}</span>
          <span className="modal-subtitle-sep">•</span>
          <span>{timeLabel}</span>
        </div>
        <div className="modal-titleblock-right">
          <span className={statusPillClass}>{status.label}</span>
        </div>
      </div>

      <div className="modal-section">
        <div className="modal-section-title">Details</div>
        <div className="modal-detail-stack">
          <div className="modal-row">
            <span className="modal-row-label">Location</span>
            <span className="modal-row-value">{ap.location || 'TBD'}</span>
          </div>

          {(ap.description || ap.notes) && (
            <div className="modal-row modal-row-multiline">
              <span className="modal-row-label">{isAvailability ? 'Description' : 'Notes'}</span>
              <span className="modal-row-value modal-row-value-block">{ap.description || ap.notes}</span>
            </div>
          )}

          {isAvailability && (
            <>
              <div className="modal-row">
                <span className="modal-row-label">Visibility</span>
                <span className="modal-row-value">{ap.visibility || '—'}</span>
              </div>
              <div className="modal-row">
                <span className="modal-row-label">Capacity</span>
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
              {ap.recurrence_rule && (
                <div className="modal-row modal-row-multiline">
                  <span className="modal-row-label">Recurrence</span>
                  <span className="modal-row-value modal-row-value-block">{ap.recurrence_rule}</span>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <div className="modal-section">
        <div className="modal-section-title">People</div>
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
      </div>
    </Modal>
  );
}

// Final confirmation before cancelling a booking or removing an availability block.
export function DeleteConfirmModal({ appointment, onConfirm, onClose }) {
  const ap = appointment || {};
  const isAvailability = ap.type === 'availability';

  function handleDelete() {
    if (!isAvailability && ap.notifyEmail) {
      const subject = encodeURIComponent(`Booking cancelled: ${ap.title}`);
      const body = encodeURIComponent(
        `Hi,\n\nYour booking "${ap.title}" on ${ap.day} at ${ap.time} has been cancelled.\n\nApologies for any inconvenience.`
      );
      window.open(`mailto:${ap.notifyEmail}?subject=${subject}&body=${body}`);
    }
    onConfirm();
    onClose();
  }

  return (
    <Modal
      title={isAvailability ? 'Delete this availability?' : 'Cancel this booking?'}
      onClose={onClose}
      footer={
        <>
          <button className="button button-ghost" onClick={onClose}>Keep it</button>
          <button className="button button-danger" onClick={handleDelete}>
            {isAvailability ? 'Yes, delete availability' : 'Yes, cancel & notify'}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
        {isAvailability
          ? 'This will permanently delete the availability slot from your calendar.'
          : 'This will permanently remove the booking and open your email client to notify the other party.'}
      </p>
      <div className="modal-row">
        <span className="modal-row-label">{isAvailability ? 'Availability' : 'Appointment'}</span>
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

// Share modal for heatmap and booking links.
export function InviteURLModal({
  ownerEmail,
  eventTitle,
  inviteURL,
  onClose,
  title = 'Share your booking page',
  description = 'Share this link so students can open the heatmap, mark their availability, and send it back to you.',
  contextLabel = 'Booking page for',
  tip = 'Tip: paste this into your course slides or email signature.',
}) {
  const [copied, setCopied] = useState(false);
  // Heatmap pages pass an explicit invite URL; older booking flows can use the fallback.
  const shareURL = inviteURL || `${window.location.origin}/heatmap`;

  function handleCopy() {
    // The copied state gives the user a quick "yes, it worked" moment.
    navigator.clipboard.writeText(shareURL).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  return (
    <Modal
      title={title}
      onClose={onClose}
      footer={
        <>
          <button className="button button-ghost" onClick={onClose}>Done</button>
          <button className="button button-primary" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
        </>
      }
    >
      <p style={{ fontSize: 13, color: '#666', marginBottom: 14, lineHeight: 1.6 }}>
        {description}
      </p>
      <p style={{ fontSize: 11, color: '#aaa', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
        {contextLabel}
      </p>
      <p style={{ fontSize: 14, fontWeight: 600, marginBottom: 12 }}>{eventTitle || ownerEmail}</p>
      <div className="copy-row">
        <input className="copy-input" readOnly value={shareURL} />
        <button className="button button-outline button-small" onClick={handleCopy} style={{ whiteSpace: 'nowrap' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
      </div>
      <p style={{ marginTop: 12, fontSize: 12, color: '#bbb' }}>
        {tip}
      </p>
    </Modal>
  );
}

// Turn a raw submitted slot into something a person can scan quickly.
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

// Review modal for a student's heatmap submission.
export function ApproveSubmissionModal({ submission, onApprove, onDecline, onClose }) {
  const s = submission || {};
  // Memoize the slots array so the selected radio button only resets when slots really change.
  const slotOptions = useMemo(() => s.slots || [], [s.slots]);
  const [selectedSlotId, setSelectedSlotId] = useState(slotOptions[0]?.id || null);

  useEffect(() => {
    // Default to the first submitted slot whenever a different submission is opened.
    setSelectedSlotId(slotOptions[0]?.id || null);
  }, [slotOptions]);

  // If the selected id no longer exists, fall back gracefully to the first slot.
  const selectedSlot = slotOptions.find((slot) => slot.id === selectedSlotId) || slotOptions[0] || null;

  return (
    <Modal
      title="Review availability submission"
      onClose={onClose}
      footer={
        <>
          <button className="button button-ghost" onClick={onClose}>Later</button>
          <button
            className="button button-outline button-small"
            style={{ borderColor: '#cc2222', color: '#cc2222' }}
            onClick={() => { onDecline(s); onClose(); }}
          >
            Decline
          </button>
          <button
            className="button button-primary button-small"
            onClick={() => {
              onApprove(s, selectedSlot);
              onClose();
            }}
            disabled={!selectedSlot}
          >
            Approve
          </button>
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
              // Radio cards are easier to review than a dense select menu for time slots.
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
