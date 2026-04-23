import React, { useEffect, useMemo, useState } from 'react';
import RecurrenceModal from './RecurrenceModal';

function toIsoLocal(date, time) {
  return `${date}T${time}:00`;
}

function getWeekdayOrder(code) {
  const order = { MO: 1, TU: 2, WE: 3, TH: 4, FR: 5, SA: 6, SU: 7 };
  return order[code] ?? 999;
}

function getWeekdayLabel(code) {
  const labels = { MO: 'Mon', TU: 'Tue', WE: 'Wed', TH: 'Thu', FR: 'Fri', SA: 'Sat', SU: 'Sun' };
  return labels[code] || code;
}

function getRecurrenceSummary(recurrence) {
  if (!recurrence?.enabled) return 'Does not repeat';

  const sortedDays = [...(recurrence.byWeekdays || [])].sort(
    (a, b) => getWeekdayOrder(a) - getWeekdayOrder(b)
  );
  const dayNames = sortedDays.map(getWeekdayLabel);

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

export default function CreateAvailabilityForm({
  onSubmit,
  onCancel,
  defaultVisibility = 'private',
  submitLabel = 'Create slot',
  initialData = null,
  initialStartTime = null,
  initialEndTime = null,
}) {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const initialDate = initialData?.start_time?.slice(0, 10) || today;

  const [form, setForm] = useState({
    av_title: initialData?.av_title || '',
    av_description: initialData?.av_description || '',
    date: initialDate,
    start_time: initialData?.start_time?.slice(11, 16) || '10:00',
    end_time: initialData?.end_time?.slice(11, 16) || '10:30',
    location: initialData?.location || '',
    capacity: initialData?.capacity ?? 1,
    visibility: initialData?.visibility || defaultVisibility,
    slot_duration_minutes: initialData?.slot_duration_minutes ?? 30,
  });

  const [recurrence, setRecurrence] = useState(() => getInitialRecurrence(initialData, initialDate));
  const [recurrenceModalOpen, setRecurrenceModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const isPublicVisibility = form.visibility === 'public';

  useEffect(() => {
    if (!initialStartTime) return;
    const start = new Date(initialStartTime);
    if (Number.isNaN(start.getTime())) return;

    const providedEnd = initialEndTime ? new Date(initialEndTime) : null;
    const end = providedEnd && !Number.isNaN(providedEnd.getTime())
      ? providedEnd
      : new Date(start.getTime() + 30 * 60000);
    const date = start.toISOString().slice(0, 10);
    const start_time = start.toTimeString().slice(0, 5);
    const end_time = end.toTimeString().slice(0, 5);

    setForm((prev) => ({
      ...prev,
      date,
      start_time,
      end_time,
    }));
    setRecurrence((prev) => ({ ...prev, baseDate: date }));
  }, [initialEndTime, initialStartTime]);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
    if (key === 'date') {
      setRecurrence((prev) => ({ ...prev, baseDate: value }));
    }
  }

  function handleRecurrenceSave(newRecurrence) {
    setRecurrence({ ...newRecurrence, baseDate: form.date });
    setRecurrenceModalOpen(false);
  }

  function handleRemoveRecurrence() {
    setRecurrence(getDefaultRecurrence(form.date));
    setRecurrenceModalOpen(false);
  }

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

    if (!Number.isInteger(Number(form.slot_duration_minutes)) || Number(form.slot_duration_minutes) < 1) {
      setError('Slot duration must be a positive integer.');
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

    try {
      setSaving(true);

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

      await onSubmit({
        av_title: form.av_title.trim() || null,
        av_description: form.av_description.trim() || null,
        start_time: start,
        end_time: end,
        location: form.location.trim() || null,
        capacity: Number(form.capacity),
        visibility: form.visibility,
        recurrence_rule: recurrencePayload,
        slot_duration_minutes: Number(form.slot_duration_minutes),
      });
    } catch (err) {
      setError(err?.message || 'Failed to save availability.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="availability-form-grid">
      <div className="availability-compact-layout form-group-full">
        <div className="availability-left-column">
          <div className="form-group">
            <label htmlFor="av_title">Title</label>
            <input
              id="av_title"
              type="text"
              value={form.av_title}
              onChange={(e) => updateField('av_title', e.target.value)}
              placeholder="Office hours"
            />
          </div>

          <div className="availability-time-row">
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
                <span className="recurrence-summary">{getRecurrenceSummary(recurrence)}</span>
              </div>
              <span className="recurrence-display-action">{recurrence.enabled ? 'Edit' : 'Custom'}</span>
            </button>
          </div>

          <div className="form-group">
            <label htmlFor="av_description">Description</label>
            <textarea
              id="av_description"
              value={form.av_description}
              onChange={(e) => updateField('av_description', e.target.value)}
              placeholder="Optional details"
              rows={3}
            />
          </div>
        </div>

        <div className="availability-right-column">
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
              <div className="visibility-toggle" role="radiogroup" aria-label="Availability visibility">
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
            <label htmlFor="slot_duration_minutes">Slot duration (minutes)</label>
            <select
              id="slot_duration_minutes"
              value={form.slot_duration_minutes}
              onChange={(e) => updateField('slot_duration_minutes', e.target.value)}
            >
              <option value="15">15</option>
              <option value="30">30</option>
              <option value="45">45</option>
              <option value="60">60</option>
            </select>
          </div>
        </div>
      </div>

      <RecurrenceModal
        isOpen={recurrenceModalOpen}
        onClose={() => setRecurrenceModalOpen(false)}
        onSave={handleRecurrenceSave}
        onRemove={handleRemoveRecurrence}
        initialRecurrence={recurrence}
        baseDate={form.date}
      />

      {error && <p className="create-av-error form-group-full">{error}</p>}

      <div className="availability-modal-footer form-group-full">
        <button type="button" className="modal-btn secondary" onClick={onCancel} disabled={saving}>
          Cancel
        </button>
        <button type="submit" className="modal-btn primary" disabled={saving}>
          {saving ? `${submitLabel}...` : submitLabel}
        </button>
      </div>
    </form>
  );
}

