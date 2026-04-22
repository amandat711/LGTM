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

  const minutesFromTop =
    (start.getHours() - CALENDAR_START_HOUR) * 60 + start.getMinutes();

  const durationMinutes = (end - start) / 60000;

  const top = (minutesFromTop / 60) * slotHeight;
  const height = Math.max((durationMinutes / 60) * slotHeight, 28);

  return { top, height };
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

  let color = '#1565a8';
  if (myStatus === 'confirmed') color = '#2a8c5f';
  else if (myStatus === 'pending') color = '#f59e0b';
  else if (myStatus === 'waiting_approval') color = '#3b82f6';
  else if (myStatus === 'cancelled') color = '#dc2626';

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