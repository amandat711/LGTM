// JOCELYNE LI (100% estimated contribution) => Calendar export/sync implementation and integration
import {
  mapAppointmentToCalendarEvent,
  slotKindFromAppointment,
} from '../components/calendar/calendarUtils';

/** Map SQL rows from GET /courses/:id (appointments array) to calendar event shape. */
export function mapCourseAppointmentRowToCalendarEvent(row, viewerUserId) {
  const n = Number(row.attendee_count || 0);
  const participants = [
    {
      participant_role: 'host',
      first_name: row.creator_first_name || '',
      last_name: row.creator_last_name || '',
      mcgill_email: '',
      user_id: null,
    },
  ];
  if (n > 0) {
    participants.push({
      participant_role: 'attendee',
      first_name: ' ',
      last_name: ' ',
      mcgill_email: '',
      user_id: 0,
    });
  }
  return mapAppointmentToCalendarEvent(
    {
      ...row,
      participants,
    },
    viewerUserId
  );
}

/**
 * @param {object[]} mapped Calendar-shaped events (not availability).
 * @param {'all'|'events'|'appointments'} filter — 'events'|'appointments' only apply when isFacultyExport is true.
 */
export function filterCalendarItemsForIcsExport(mapped, filter, isFacultyExport) {
  const list = (mapped || []).filter((ev) => {
    if (!ev || ev.type === 'availability') return false;
    if (ev.appointmentStatus === 'cancelled') return false;
    return true;
  });

  if (!isFacultyExport || filter === 'all') return list;

  return list.filter((ev) => {
    const kind = slotKindFromAppointment(ev).key;
    if (filter === 'events') return kind === 'event';
    if (filter === 'appointments') return kind === 'appointment';
    return true;
  });
}

export function calendarEventsToIcsPayload(mapped) {
  return mapped.map((ev) => ({
    id: ev.id,
    title: ev.title || 'Appointment',
    startTime: ev.startTime,
    endTime: ev.endTime,
    description: [ev.description || ev.notes, ev.ownerName ? `Host: ${ev.ownerName}` : '']
      .filter(Boolean)
      .join('\\n'),
    location: ev.location || '',
  }));
}
