/**
 * Build a minimal RFC 5545 .ics document for Google Calendar, Outlook, etc.
 */

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

/** Local floating DATE-TIME (no Z) so the wall time matches the app. */
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
  return `${u.getUTCFullYear()}${pad2(u.getUTCMonth() + 1)}${pad2(u.getUTCDate())}T${pad2(u.getUTCHours())}${pad2(u.getUTCMinutes())}${pad2(u.getUTCSeconds())}Z`;
}

/**
 * @param {Array<{ id: string|number, title: string, startTime: string, endTime: string, description?: string, location?: string }>} items
 */
export function buildIcsDocument(items) {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//LGTM//Calendar Export//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
  ];

  const stamp = formatIcsUtcStamp();

  (items || []).forEach((ev) => {
    const dtStart = formatIcsDateTimeLocal(ev.startTime);
    const dtEnd = formatIcsDateTimeLocal(ev.endTime);
    if (!dtStart || !dtEnd) return;

    const uidBase = ev.id != null ? String(ev.id) : `${dtStart}-${Math.random().toString(36).slice(2)}`;
    const uid = `${uidBase.replace(/[^a-zA-Z0-9@-]/g, '')}@lgtm-calendar`;

    lines.push('BEGIN:VEVENT');
    lines.push(`UID:${uid}`);
    lines.push(`DTSTAMP:${stamp}`);
    lines.push(`DTSTART:${dtStart}`);
    lines.push(`DTEND:${dtEnd}`);
    lines.push(`SUMMARY:${escapeIcsText(ev.title || 'Appointment')}`);
    if (ev.location) lines.push(`LOCATION:${escapeIcsText(ev.location)}`);
    if (ev.description) lines.push(`DESCRIPTION:${escapeIcsText(ev.description)}`);
    lines.push('END:VEVENT');
  });

  lines.push('END:VCALENDAR');
  return `${lines.map(foldLine).join('\r\n')}\r\n`;
}

export function downloadTextFile(filename, text, mime = 'text/calendar;charset=utf-8') {
  const blob = new Blob([text], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
