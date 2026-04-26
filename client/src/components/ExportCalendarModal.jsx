import { useEffect, useMemo, useState } from 'react';
import { Modal } from './Modals';
import { getHostingAppointments, getMyAppointments } from '../api/appointments';
import { mapAppointmentToCalendarEvent } from './calendar/calendarUtils';
import {
  calendarEventsToIcsPayload,
  filterCalendarItemsForIcsExport,
  mapCourseAppointmentRowToCalendarEvent,
} from '../utils/exportCalendarData';
import { buildIcsDocument, downloadTextFile } from '../utils/calendarIcs';

/**
 * @param {'hosting'|'my'|'course'} exportSource
 * @param {object[]|null|undefined} courseAppointmentRows — required when exportSource is 'course'
 */
export default function ExportCalendarModal({
  open,
  onClose,
  userId,
  isFaculty,
  exportSource,
  courseAppointmentRows,
  downloadFileBaseName = 'lgtm-calendar',
}) {
  const [filter, setFilter] = useState('all');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setFilter('all');
    setError('');
    setBusy(false);
  }, [open]);

  const showKindFilter = useMemo(
    () => Boolean(isFaculty && (exportSource === 'hosting' || exportSource === 'course')),
    [isFaculty, exportSource]
  );

  async function handleDownload() {
    setError('');
    setBusy(true);
    try {
      let raw = [];
      if (exportSource === 'course') {
        raw = Array.isArray(courseAppointmentRows) ? courseAppointmentRows : [];
      } else if (exportSource === 'hosting') {
        raw = await getHostingAppointments(userId);
      } else {
        raw = await getMyAppointments(userId);
      }

      const mapped =
        exportSource === 'course'
          ? raw.map((row) => mapCourseAppointmentRowToCalendarEvent(row, userId))
          : raw.map((row) => mapAppointmentToCalendarEvent(row, userId));

      const effectiveFilter = showKindFilter ? filter : 'all';
      const filtered = filterCalendarItemsForIcsExport(mapped, effectiveFilter, showKindFilter);
      const payload = calendarEventsToIcsPayload(filtered);

      if (payload.length === 0) {
        setError('No items to export for this selection.');
        return;
      }

      const ics = buildIcsDocument(payload);
      downloadTextFile(`${downloadFileBaseName}.ics`, ics);
      onClose();
    } catch (e) {
      setError(e?.message || 'Export failed.');
    } finally {
      setBusy(false);
    }
  }

  function handleRequestClose() {
    if (!busy) onClose();
  }

  if (!open) return null;

  return (
    <Modal
      title="Export Calendar"
      onClose={handleRequestClose}
      className="export-calendar-modal"
      footer={
        <>
          <button type="button" className="button button-primary" onClick={handleDownload} disabled={busy}>
            {busy ? 'Preparing…' : 'Download .ics'}
          </button>
        </>
      }
    >
      <p className="export-calendar-intro">
        Download an .ics file, then open it in Google Calendar, Outlook, Apple Calendar, or another app that
        supports the iCalendar format.
      </p>

      {showKindFilter ? (
        <div className="modal-section">
          <h4 className="modal-section-title">Include</h4>
          <div className="export-calendar-radio-list" role="radiogroup" aria-label="What to export">
            {[
              { value: 'events', label: 'Events only' },
              { value: 'appointments', label: 'Appointments only' },
              { value: 'all', label: 'All' },
            ].map(({ value, label }) => (
              <label
                key={value}
                className={`export-calendar-radio-option${filter === value ? ' export-calendar-radio-option--selected' : ''}`}
              >
                <input
                  type="radio"
                  name="export-calendar-filter"
                  value={value}
                  checked={filter === value}
                  onChange={() => setFilter(value)}
                  disabled={busy}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </div>
      ) : (
        <p className="modal-recurrence-line export-calendar-participant-note">
          All of your appointments on LGTM will be included.
        </p>
      )}

      {error ? <p className="export-calendar-error">{error}</p> : null}
    </Modal>
  );
}
