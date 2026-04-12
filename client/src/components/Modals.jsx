import React, { useEffect, useMemo, useState } from 'react';

// ─── Shared shell ─────────────────────────────────────────────
function Modal({ title, onClose, children, footer }) {
  return (
    <div
      className="modal-overlay"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="modal">
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
export function SlotDetailModal({ appointment, isOwner, onDelete, onClose }) {
  const ap = appointment || {};

  return (
    <Modal
      title={ap.title || 'Appointment details'}
      onClose={onClose}
      footer={
        <>
          {isOwner && (
            <button className="button button-danger button-small" onClick={onDelete}>
              Cancel booking
            </button>
          )}
          <a
            href={`mailto:${ap.ownerEmail || ''}?subject=Re: ${encodeURIComponent(ap.title || 'Appointment')}`}
            className="button button-outline button-small"
            style={{ textDecoration: 'none' }}
          >
            Email {isOwner ? 'attendee' : 'owner'}
          </a>
          <button className="button button-ghost" onClick={onClose}>Close</button>
        </>
      }
    >
      <div className="modal-row">
        <span className="modal-row-label">Date</span>
        <span className="modal-row-value">{ap.day}</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">Time</span>
        <span className="modal-row-value">{ap.time}</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">{isOwner ? 'Booked by' : 'Owner'}</span>
        <span className="modal-row-value">{isOwner ? ap.bookedBy : ap.owner}</span>
      </div>
      {ap.location && (
        <div className="modal-row">
          <span className="modal-row-label">Location</span>
          <span className="modal-row-value">{ap.location}</span>
        </div>
      )}
      {ap.notes && (
        <div className="modal-row" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
          <span className="modal-row-label">Notes</span>
          <p style={{ fontSize: 13, color: '#333', marginTop: 4, lineHeight: 1.5 }}>{ap.notes}</p>
        </div>
      )}
      <div className="modal-row">
        <span className="modal-row-label">Status</span>
        <span className="badge-pending">{ap.status || 'Pending'}</span>
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

  function handleDelete() {
    const subject = encodeURIComponent(`Booking cancelled: ${ap.title}`);
    const body    = encodeURIComponent(
      `Hi,\n\nYour booking "${ap.title}" on ${ap.day} at ${ap.time} has been cancelled.\n\nApologies for any inconvenience.`
    );
    window.open(`mailto:${ap.notifyEmail}?subject=${subject}&body=${body}`);
    // TODO: DELETE /api/appointments/:id
    onConfirm();
    onClose();
  }

  return (
    <Modal
      title="Cancel this booking?"
      onClose={onClose}
      footer={
        <>
          <button className="button button-ghost" onClick={onClose}>Keep it</button>
          <button className="button button-danger" onClick={handleDelete}>
            Yes, cancel &amp; notify
          </button>
        </>
      }
    >
      <p style={{ fontSize: 14, color: '#555', marginBottom: 16, lineHeight: 1.6 }}>
        This will permanently remove the booking and open your email client to notify the other party.
      </p>
      <div className="modal-row">
        <span className="modal-row-label">Appointment</span>
        <span className="modal-row-value">{ap.title}</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">Date &amp; time</span>
        <span className="modal-row-value">{ap.day} at {ap.time}</span>
      </div>
      <div className="modal-row">
        <span className="modal-row-label">Notify</span>
        <span className="modal-row-value">{ap.notifyEmail}</span>
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
          <button className="button button-ghost" onClick={onClose}>Done</button>
          <button className="button button-primary" onClick={handleCopy}>
            {copied ? '✓ Copied!' : 'Copy link'}
          </button>
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
        <button className="button button-outline button-small" onClick={handleCopy} style={{ whiteSpace: 'nowrap' }}>
          {copied ? '✓ Copied' : 'Copy'}
        </button>
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
