import React, { useEffect, useMemo, useState } from 'react';
import RecurrenceModal from './RecurrenceModal';
import { getUsers } from '../api/users';
import { getCourses } from '../api/courses';
import {
  toLocalDateInputValue,
  toLocalTimeInputValue,
} from './calendar/calendarUtils';

const EVENT_COLORS = [
  '#1565A8',
  '#2A8C5F',
  '#7C3AED',
  '#C2410C',
  '#BE123C',
  '#0F766E',
  '#4F46E5',
  '#334155',
];

function toIsoLocal(date, time) {
  return `${date}T${time}:00`;
}

function getDefaultRecurrence(baseDate) {
  return {
    enabled: false,
    frequency: 'weekly',
    interval: 1,
    byWeekdays: [],
    endType: 'never',
    until: '',
    count: 13,
    baseDate: baseDate || '',
  };
}

function getInitialRecurrence(initialData, baseDate) {
  if (!initialData?.recurrence_rule) return getDefaultRecurrence(baseDate);
  try {
    const parsed =
      typeof initialData.recurrence_rule === 'string'
        ? JSON.parse(initialData.recurrence_rule)
        : initialData.recurrence_rule;
    return {
      enabled: Boolean(parsed?.enabled),
      frequency: parsed?.frequency || 'weekly',
      interval: Number(parsed?.interval) || 1,
      byWeekdays: Array.isArray(parsed?.byWeekdays) ? parsed.byWeekdays : [],
      endType: parsed?.endType || 'never',
      until: parsed?.until || '',
      count: Number(parsed?.count) || 13,
      baseDate: baseDate || '',
    };
  } catch {
    return getDefaultRecurrence(baseDate);
  }
}

export default function CreateAppointmentForm({
  mode = 'event',
  onSubmit,
  onCancel,
  defaultVisibility = 'private',
  submitLabel,
  initialStartTime = null, // ISO string
  initialEndTime = null, // ISO string
  initialData = null,
  ownerUserId = null,
  forcedCourse = null,
}) {
  const today = useMemo(() => toLocalDateInputValue(new Date()), []);
  const initialDate = initialData?.start_time
    ? toLocalDateInputValue(initialData.start_time)
    : today;

  const [form, setForm] = useState({
    ap_title: initialData?.ap_title || '',
    ap_description: initialData?.ap_description || '',
    date: initialDate,
    start_time: initialData?.start_time ? toLocalTimeInputValue(initialData.start_time) : '10:00',
    end_time: initialData?.end_time ? toLocalTimeInputValue(initialData.end_time) : '10:30',
    location: initialData?.location || '',
    capacity: initialData?.capacity ?? 1,
    visibility: initialData?.visibility || defaultVisibility,
    ap_color: initialData?.ap_color || '#1565A8',
    course_id:
      forcedCourse?.course_id != null
        ? String(forcedCourse.course_id)
        : initialData?.course_id != null
          ? String(initialData.course_id)
          : '',
  });

  const [recurrence, setRecurrence] = useState(() => getInitialRecurrence(initialData, initialDate));
  const [recurrenceModalOpen, setRecurrenceModalOpen] = useState(false);

  const [inviteQuery, setInviteQuery] = useState('');
  const [inviteResults, setInviteResults] = useState([]);
  const [selectedInvitees, setSelectedInvitees] = useState([]);

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const isPublicVisibility = form.visibility === 'public';

  useEffect(() => {
    if (forcedCourse?.course_id == null) return;
    setForm((prev) => ({ ...prev, course_id: String(forcedCourse.course_id) }));
  }, [forcedCourse]);

  useEffect(() => {
    if (forcedCourse?.course_id != null || !ownerUserId) return;
    let active = true;
    setCoursesLoading(true);
    getCourses()
      .then((data) => {
        if (!active) return;
        const list = Array.isArray(data?.courses) ? data.courses : [];
        const ownerOnly = list.filter((course) => {
          if (course.is_owner != null) return Boolean(course.is_owner);
          if (course.owner_user_id != null) return Number(course.owner_user_id) === Number(ownerUserId);
          return true;
        });
        setAllCourses(ownerOnly);
      })
      .catch(() => {
        if (!active) return;
        setAllCourses([]);
      })
      .finally(() => {
        if (active) setCoursesLoading(false);
      });
    return () => {
      active = false;
    };
  }, [forcedCourse, ownerUserId]);

  useEffect(() => {
    if (!initialStartTime) return;
    const start = new Date(initialStartTime);
    if (Number.isNaN(start.getTime())) return;

    const providedEnd = initialEndTime ? new Date(initialEndTime) : null;
    const end = providedEnd && !Number.isNaN(providedEnd.getTime())
      ? providedEnd
      : new Date(start.getTime() + 30 * 60000);
    const date = toLocalDateInputValue(start);
    const start_time = toLocalTimeInputValue(start);
    const end_time = toLocalTimeInputValue(end);

    setForm((prev) => ({
      ...prev,
      date,
      start_time,
      end_time,
    }));
    setRecurrence((prev) => ({ ...prev, baseDate: date }));
  }, [initialEndTime, initialStartTime]);

  const finalSubmitLabel = submitLabel || (mode === 'edit'
    ? 'Save changes'
    : (selectedInvitees.length > 0 ? 'Send invitation' : 'Create event'));

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'date') {
      setRecurrence((prev) => ({ ...prev, baseDate: value }));
    }
  }

  function toggleInvitee(user) {
    setSelectedInvitees((prev) => {
      const exists = prev.some((u) => u.id === user.id);
      return exists ? prev.filter((u) => u.id !== user.id) : [...prev, user];
    });
  }

  useEffect(() => {
    let active = true;
    const q = inviteQuery.trim();

    async function run() {
      if (!q) {
        setInviteResults([]);
        return;
      }

      try {
        const users = await getUsers({ q });
        if (!active) return;
        setInviteResults(users);
      } catch {
        if (!active) return;
        setInviteResults([]);
      }
    }

    run();
    return () => {
      active = false;
    };
  }, [inviteQuery]);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const start = toIsoLocal(form.date, form.start_time);
    const end = toIsoLocal(form.date, form.end_time);

    if (new Date(end) <= new Date(start)) {
      setError('End time must be after start time.');
      return;
    }

    if (!Number.isInteger(Number(form.capacity)) || Number(form.capacity) < 1) {
      setError('Capacity must be at least 1.');
      return;
    }

    if (recurrence.enabled) {
      if (!Array.isArray(recurrence.byWeekdays) || recurrence.byWeekdays.length === 0) {
        setError('Recurrence: select at least one weekday.');
        return;
      }
      if (!Number.isInteger(Number(recurrence.interval)) || Number(recurrence.interval) < 1) {
        setError('Recurrence: interval must be at least 1.');
        return;
      }
      if (recurrence.endType === 'on' && !recurrence.until) {
        setError('Recurrence: select an end date.');
        return;
      }
      if (
        recurrence.endType === 'after' &&
        (!Number.isInteger(Number(recurrence.count)) || Number(recurrence.count) < 1)
      ) {
        setError('Recurrence: occurrences must be at least 1.');
        return;
      }
    }

    const recurrencePayload = recurrence.enabled
      ? {
          enabled: true,
          frequency: 'weekly',
          interval: Number(recurrence.interval),
          byWeekdays: recurrence.byWeekdays,
          endType: recurrence.endType,
          until: recurrence.endType === 'on' ? recurrence.until : null,
          count: recurrence.endType === 'after' ? Number(recurrence.count) : null,
        }
      : null;

    try {
      setSaving(true);
      await onSubmit({
        ap_title: form.ap_title.trim() || null,
        ap_description: form.ap_description.trim() || null,
        start_time: start,
        end_time: end,
        location: form.location.trim() || null,
        capacity: Number(form.capacity),
        visibility: form.visibility,
        course_id: form.course_id ? Number(form.course_id) : null,
        invitee_user_ids: selectedInvitees.map((u) => u.id),
        recurrence_rule: recurrencePayload,
        ap_color: form.ap_color,
      });
    } catch (err) {
      setError(err?.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} appointment.`);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="availability-form-grid">
      <div className="appointment-compact-layout form-group-full">
        <div className="appointment-left-column">
          <div className="form-group">
            <label htmlFor="ap_title">{mode === 'appointment' ? 'Appointment title' : 'Event title'}</label>
            <input
              id="ap_title"
              type="text"
              value={form.ap_title}
              onChange={(e) => updateField('ap_title', e.target.value)}
              placeholder={mode === 'appointment' ? 'Student meeting' : 'Lecture / lab / meeting'}
            />
          </div>

          <div className="appointment-time-row">
            <div className="form-group">
              <label htmlFor="date">Date</label>
              <input
                id="date"
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="start_time">Start time</label>
              <input
                id="start_time"
                type="time"
                value={form.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="end_time">End time</label>
              <input
                id="end_time"
                type="time"
                value={form.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Recurrence</label>
            <button type="button" className="recurrence-display" onClick={() => setRecurrenceModalOpen(true)}>
              <div className="recurrence-display-text">
                <span className={`recurrence-badge ${recurrence.enabled ? 'active' : ''}`}>
                  {recurrence.enabled ? 'Repeating' : 'One-time'}
                </span>
                <span className="recurrence-summary">
                  {recurrence.enabled ? 'Custom recurrence applied' : 'Does not repeat'}
                </span>
              </div>
              <span className="recurrence-display-action">{recurrence.enabled ? 'Edit' : 'Custom'}</span>
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="ap_description">Description</label>
            <textarea
              id="ap_description"
              value={form.ap_description}
              onChange={(e) => updateField('ap_description', e.target.value)}
              placeholder="Optional details"
              rows={3}
            />
          </div>
        </div>

        <div className="appointment-right-column">
          <div className="right-meta-row">
            <div className="form-group">
              <label htmlFor="capacity">Capacity</label>
              <input
                id="capacity"
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => updateField('capacity', e.target.value)}
              />
            </div>

            <div className="form-group">
              <label>Visibility</label>
              <div className="visibility-toggle" role="radiogroup" aria-label="Visibility">
                <button
                  type="button"
                  className={`visibility-toggle-btn ${!isPublicVisibility ? 'active' : ''}`}
                  onClick={() => updateField('visibility', 'private')}
                  aria-pressed={!isPublicVisibility}
                >
                  Private
                </button>
                <button
                  type="button"
                  className={`visibility-toggle-btn ${isPublicVisibility ? 'active' : ''}`}
                  onClick={() => updateField('visibility', 'public')}
                  aria-pressed={isPublicVisibility}
                >
                  Public
                </button>
              </div>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="location">Location</label>
            <input
              id="location"
              type="text"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Trottier 3xxx or Zoom"
            />
          </div>

          <div className="form-group">
            <label>Color</label>
            <div className="event-color-picker" role="radiogroup" aria-label="Event color">
              {EVENT_COLORS.map((hex) => {
                const selected = form.ap_color === hex;
                return (
                  <button
                    key={hex}
                    type="button"
                    className={`event-color-swatch${selected ? ' selected' : ''}`}
                    style={{ backgroundColor: hex }}
                    aria-label={`Select color ${hex}`}
                    aria-pressed={selected}
                    onClick={() => updateField('ap_color', hex)}
                  />
                );
              })}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="course_id">Course</label>
            {forcedCourse?.course_id != null ? (
              <>
                <input
                  id="course_id"
                  type="text"
                  value={
                    `${forcedCourse.course_code || ''} ${forcedCourse.course_name || ''}`.trim()
                    || `Course ${forcedCourse.course_id}`
                  }
                  readOnly
                />
                <small>This event is locked to this course.</small>
              </>
            ) : (
              <>
                <select
                  id="course_id"
                  value={form.course_id}
                  onChange={(e) => updateField('course_id', e.target.value)}
                >
                  <option value="">No course</option>
                  {allCourses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_code} - {course.course_name}
                    </option>
                  ))}
                </select>
                {coursesLoading ? <small>Loading courses...</small> : null}
              </>
            )}
          </div>

          <div className="form-group">
            <label>Add people</label>
            <input
              type="text"
              value={inviteQuery}
              onChange={(e) => setInviteQuery(e.target.value)}
              placeholder="Search by name or email"
            />

            {selectedInvitees.length > 0 && (
              <div className="invite-chip-list">
                {selectedInvitees.map((u) => (
                  <button
                    key={u.id}
                    type="button"
                    className="button button-outline button-small"
                    onClick={() => toggleInvitee(u)}
                    title="Remove invitee"
                  >
                    {u.name} ×
                  </button>
                ))}
              </div>
            )}

            {inviteResults.length > 0 && inviteQuery.trim() && (
              <div className="invite-results-list">
                {inviteResults.slice(0, 8).map((u) => {
                  const selected = selectedInvitees.some((s) => s.id === u.id);
                  return (
                    <button
                      key={u.id}
                      type="button"
                      onClick={() => toggleInvitee(u)}
                      className="invite-result-item"
                      style={{ background: selected ? '#f7f7f7' : '#fff' }}
                    >
                      <span style={{ textAlign: 'left' }}>
                        <div style={{ fontWeight: 600 }}>{u.name}</div>
                        <div style={{ fontSize: 12, color: '#666' }}>{u.email}</div>
                      </span>
                      <span style={{ fontSize: 12, color: selected ? '#2a8c5f' : '#999' }}>
                        {selected ? 'Selected' : 'Select'}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      <RecurrenceModal
        isOpen={recurrenceModalOpen}
        onClose={() => setRecurrenceModalOpen(false)}
        onSave={(next) => {
          setRecurrence({ ...next, baseDate: form.date });
          setRecurrenceModalOpen(false);
        }}
        onRemove={() => {
          setRecurrence(getDefaultRecurrence(form.date));
          setRecurrenceModalOpen(false);
        }}
        initialRecurrence={recurrence}
        baseDate={form.date}
      />

      {error && <p className="create-av-error form-group-full">{error}</p>}

      <div className="availability-modal-footer form-group-full">
        <button type="button" className="modal-btn secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="modal-btn primary" disabled={saving}>
          {saving ? `${finalSubmitLabel}...` : finalSubmitLabel}
        </button>
      </div>
    </form>
  );
}

