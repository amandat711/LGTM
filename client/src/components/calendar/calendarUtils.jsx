export const DAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export const HOURS = Array.from({ length: 15 }, (_, i) => i + 7);

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
  if (status === 'waiting_approval') return { label: 'Waiting', cls: 'status-waiting' };
  if (status === 'cancelled') return { label: 'Cancelled', cls: 'status-cancelled' };
  return { label: status || 'Unknown', cls: '' };
}

export function getEventStyle(appt) {
  const start = new Date(appt.startTime);
  const end = new Date(appt.endTime);

  const top = ((start.getHours() - 7) * 60 + start.getMinutes()) * (48 / 60);
  const height = Math.max(((end - start) / 60000) * (48 / 60), 20);

  return { top, height };
}

export function mapAppointmentToCalendarEvent(appt) {
  const host = appt.participants?.find((p) => p.participant_role === 'host');
  const attendee = appt.participants?.find((p) => p.participant_role === 'attendee');

  let color = '#1565a8';
  if (appt.status === 'confirmed') color = '#2a8c5f';
  else if (appt.status === 'pending') color = '#c0842a';
  else if (appt.status === 'cancelled') color = '#777777';

  return {
    id: appt.appointment_id,
    title: appt.ap_title || 'Appointment',
    ownerName: host ? `${host.first_name} ${host.last_name}` : 'Host',
    ownerEmail: host?.mcgill_email || '',
    attendeeName: attendee ? `${attendee.first_name} ${attendee.last_name}` : '',
    attendeeEmail: attendee?.mcgill_email || '',
    startTime: appt.start_time,
    endTime: appt.end_time,
    location: appt.location || 'TBD',
    status: appt.status,
    color,
    participants: appt.participants || [],
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