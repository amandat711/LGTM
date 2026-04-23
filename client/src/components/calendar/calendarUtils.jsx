export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

// Change these if you want a different visible range
export const CALENDAR_START_HOUR = 6;
export const CALENDAR_END_HOUR = 23;

// 6am -> 11pm inclusive
export const HOURS = Array.from(
  { length: CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1 },
  (_, i) => i + CALENDAR_START_HOUR
);

export function getCalendarTimeZone() {
  return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
}

export function getCalendarTimeZoneLabel(date = new Date()) {
  const timeZone = getCalendarTimeZone();
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    timeZoneName: 'short',
  });
  const zonePart = formatter.formatToParts(date).find((part) => part.type === 'timeZoneName');
  return zonePart?.value || timeZone;
}

export function toLocalDateInputValue(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function toLocalTimeInputValue(value = new Date()) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  const hour = String(d.getHours()).padStart(2, '0');
  const minute = String(d.getMinutes()).padStart(2, '0');
  return `${hour}:${minute}`;
}

export function formatTime(iso) {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export function formatDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} @ ${formatTime(iso)}`;
}

export function isSameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

/** Bookings with row status cancelled are hidden from week calendars (still available via GET /:id if needed). */
export function includeAppointmentOnWeekCalendar(event) {
  if (!event || event.type === 'availability') return true;
  return event.appointmentStatus !== 'cancelled';
}

const WEEKDAY_ORDER = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
const WEEKDAY_LABEL = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };

function weekdayOrder(code) {
  return WEEKDAY_ORDER[code] ?? 999;
}

function weekdayLabel(code) {
  return WEEKDAY_LABEL[code] || code;
}

function summarizeParsedRecurrence(recurrence) {
  if (!recurrence?.enabled) return '';

  const sortedDays = [...(recurrence.byWeekdays || [])].sort((a, b) => weekdayOrder(a) - weekdayOrder(b));
  const dayNames = sortedDays.map(weekdayLabel);

  let summary = `Repeats every ${recurrence.interval} week${recurrence.interval > 1 ? 's' : ''}`;
  if (dayNames.length > 0) {
    summary += dayNames.length <= 2 ? ` on ${dayNames.join(' and ')}` : ` on ${dayNames.join(', ')}`;
  }

  if (recurrence.endType === 'on' && recurrence.until) {
    summary += ` until ${recurrence.until}`;
  } else if (recurrence.endType === 'after' && recurrence.count) {
    summary += ` for ${recurrence.count} occurrence${recurrence.count !== 1 ? 's' : ''}`;
  }

  return summary;
}

function parseRecurrenceRulePayload(rule) {
  if (rule == null || rule === '') return null;
  if (typeof rule === 'object' && !Array.isArray(rule)) return rule;
  if (typeof rule === 'string') {
    const t = rule.trim();
    if (!t) return null;
    try {
      const p = JSON.parse(t);
      return typeof p === 'object' && p !== null ? p : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * One-line human summary for under date/time in modals (matches app recurrence JSON shape).
 */
export function formatRecurrenceSubtitleLine({ recurrence_rule, recurrence_group_id } = {}) {
  const parsed = parseRecurrenceRulePayload(recurrence_rule);
  if (parsed?.enabled) {
    return summarizeParsedRecurrence(parsed);
  }
  if (typeof recurrence_rule === 'string' && recurrence_rule.trim() && !parsed) {
    const t = recurrence_rule.trim();
    return t.length > 100 ? `${t.slice(0, 97)}…` : t;
  }
  if (Number(recurrence_group_id) > 0) {
    return 'Part of a recurring series';
  }
  return '';
}

export function statusLabel(status) {
  if (status === 'confirmed') return { label: 'Confirmed', cls: 'status-confirmed' };
  if (status === 'pending') return { label: 'Pending', cls: 'status-pending' };
  if (status === 'waiting_approval') return { label: 'Waiting for approval', cls: 'status-waiting' };
  if (status === 'cancelled') return { label: 'Cancelled', cls: 'status-cancelled' };
  return { label: status || 'Unknown', cls: '' };
}

export function getEventStyle(appt, slotHeight = 64) {
  const start = new Date(appt.startTime);
  const end = new Date(appt.endTime);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end <= start) {
    return { top: 0, height: 0, isVisible: false };
  }

  const totalMinutes = (CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1) * 60;
  const startMinutes = (start.getHours() - CALENDAR_START_HOUR) * 60 + start.getMinutes();
  const endMinutes = (end.getHours() - CALENDAR_START_HOUR) * 60 + end.getMinutes();
  const visibleStart = Math.max(startMinutes, 0);
  const visibleEnd = Math.min(endMinutes, totalMinutes);

  if (visibleEnd <= visibleStart) {
    return { top: 0, height: 0, isVisible: false };
  }

  const top = (visibleStart / 60) * slotHeight;
  const height = Math.max(((visibleEnd - visibleStart) / 60) * slotHeight, 18);

  return { top, height, isVisible: true };
}

export function mapAppointmentToCalendarEvent(appt, viewerUserId = null) {
  const host = appt.participants?.find((p) => p.participant_role === 'host');
  const attendee = appt.participants?.find((p) => p.participant_role === 'attendee');
  const participantStatuses = (appt.participants || []).map((p) => ({
    userId: p.user_id,
    name: `${p.first_name || ''} ${p.last_name || ''}`.trim() || 'Unknown user',
    email: p.mcgill_email || '',
    role: p.participant_role,
    status:
      p.participant_status ||
      (p.response_status === 'accepted'
        ? 'confirmed'
        : p.response_status === 'declined'
          ? 'cancelled'
          : 'pending'),
  }));
  const attendeeStatuses = participantStatuses.filter((p) => p.role === 'attendee');

  const myParticipant = participantStatuses.find((p) => Number(p.userId) === Number(viewerUserId));
  const myStatus = appt.status === 'cancelled' ? 'cancelled' : (myParticipant?.status || appt.status || 'pending');
  const color = appt.ap_color || '#1565A8';

  return {
    id: appt.appointment_id,
    title: appt.ap_title || 'Appointment',
    ownerName: host ? `${host.first_name} ${host.last_name}` : 'Host',
    ownerEmail: host?.mcgill_email || '',
    attendeeName: attendee ? `${attendee.first_name} ${attendee.last_name}` : '',
    attendeeEmail: attendee?.mcgill_email || '',
    attendeeStatus:
      attendee?.participant_status ||
      (attendee?.response_status === 'accepted'
        ? 'confirmed'
        : attendee?.response_status === 'declined'
          ? 'cancelled'
          : 'pending'),
    startTime: appt.start_time,
    endTime: appt.end_time,
    description: appt.ap_description || '',
    notes: appt.ap_description || '',
    capacity: Number(appt.capacity ?? 1),
    visibility: appt.visibility || 'private',
    recurrence_group_id:
      appt.recurrence_group_id ?? appt.source_recurrence_group_id ?? null,
    recurrence_instance_date: appt.source_recurrence_instance_date ?? appt.recurrence_instance_date ?? null,
    recurrence_rule: appt.recurrence_rule ?? appt.source_recurrence_rule ?? null,
    course_id: appt.course_id ?? null,
    location: appt.location || 'TBD',
    status: myStatus,
    appointmentStatus: appt.status,
    color,
    participants: appt.participants || [],
    participantStatuses,
    attendeeStatuses,
  };
}

export function mapAvailabilityToCalendarEvent(slot, currentUserName = 'You') {
  const bookedCount = Number(slot.booked_count || 0);
  const capacity = Number(slot.capacity || 1);
  const isFull = bookedCount >= capacity;

  return {
    id: `availability-${slot.availability_id}`,
    rawId: slot.availability_id,
    type: 'availability',
    recurrence_group_id: slot.recurrence_group_id || null,
    recurrence_instance_date: slot.recurrence_instance_date || null,
    is_recurrence_exception: Number(slot.is_recurrence_exception || 0),
    title: slot.av_title || 'Availability',
    description: slot.av_description || '',
    startTime: slot.start_time,
    endTime: slot.end_time,
    location: slot.location || 'No location',
    status: isFull ? 'booked' : 'available',
    ownerName: currentUserName,
    ownerEmail: '',
    attendeeName: bookedCount > 0 ? `${bookedCount}/${capacity} booked` : 'Open slot',
    visibility: slot.visibility,
    capacity,
    bookedCount,
    recurrence_rule: slot.recurrence_rule,
    course_id: slot.course_id ?? null,
    color: '#6B7280',
  };
}

export function getDisplayUserFromAppointments(appointments, userId, fallbackRoleLabel) {
  const numericUserId = Number(userId);

  for (const appt of appointments) {
    const match = appt.participants?.find((p) => Number(p.user_id) === numericUserId);
    if (match) {
      return {
        firstName: match.first_name || 'User',
        lastName: match.last_name || String(userId),
        role: fallbackRoleLabel,
      };
    }
  }

  return {
    firstName: 'User',
    lastName: String(userId),
    role: fallbackRoleLabel,
  };
}