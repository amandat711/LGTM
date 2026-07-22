// JOCELYNE LI (100% estimated contribution) => Calendar export/sync implementation and integration
function escapeIcsText(value) {
  if (value == null) return '';
  return String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\n/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

function foldLine(line) {
  const max = 73;
  if (line.length <= max) return line;
  const parts = [];
  let i = 0;
  while (i < line.length) {
    const chunk = i === 0 ? line.slice(i, i + max) : ` ${line.slice(i, i + max - 1)}`;
    parts.push(chunk);
    i += i === 0 ? max : max - 1;
  }
  return parts.join('\r\n');
}

function pad2(n) {
  return String(n).padStart(2, '0');
}

function formatIcsDateTimeLocal(isoOrSql) {
  const d = new Date(typeof isoOrSql === 'string' ? String(isoOrSql).replace(' ', 'T') : isoOrSql);
  if (Number.isNaN(d.getTime())) return null;
  return (
    `${d.getFullYear()}${pad2(d.getMonth() + 1)}${pad2(d.getDate())}` +
    `T${pad2(d.getHours())}${pad2(d.getMinutes())}${pad2(d.getSeconds())}`
  );
}

function formatIcsUtcStamp(date = new Date()) {
  const u = new Date(date);
  return `${u.getUTCFullYear()}${pad2(u.getUTCMonth() + 1)}${pad2(u.getUTCDate())}T${pad2(
    u.getUTCHours()
  )}${pad2(u.getUTCMinutes())}${pad2(u.getUTCSeconds())}Z`;
}

function sanitizeUidPart(value) {
  return String(value).replace(/[^a-zA-Z0-9@._-]/g, '');
}

function eventUidForAppointmentId(appointmentId) {
  return `${sanitizeUidPart(`appointment-${appointmentId}`)}@lgtm-calendar`;
}

function buildIcsDocument(items) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LGTM//Calendar Sync//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const stamp = formatIcsUtcStamp();

  (items || []).forEach((ev) => {
    const dtStart = formatIcsDateTimeLocal(ev.startTime);
    const dtEnd = formatIcsDateTimeLocal(ev.endTime);
    if (!dtStart || !dtEnd) return;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${eventUidForAppointmentId(ev.id)}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`SEQUENCE:${Number.isFinite(Number(ev.sequence)) ? Number(ev.sequence) : 0}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.title || 'Appointment')}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    if (String(ev.status || '').toLowerCase() === 'cancelled') {
      lines.push('STATUS:CANCELLED');
    }
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

module.exports = {
  buildIcsDocument,
  eventUidForAppointmentId,
};
