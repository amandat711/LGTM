import React, { useState } from 'react';
import '../styles/CreateAvailabilityModal.css';
import { toIsoWithOffsetFromLocalParts, toLocalDateInputValue } from '../utils/dateTime';
import RecurrenceModal from './RecurrenceModal';

function toIsoLocal(date, time) {
  return toIsoWithOffsetFromLocalParts(date, time);
}

function getWeekdayOrder(code) {
  const order = {
    MO: 1,
    TU: 2,
    WE: 3,
    TH: 4,
    FR: 5,
    SA: 6,
    SU: 7,
  };
  return order[code] ?? 999;
}

function getRecurrenceSummary(recurrence) {
  if (!recurrence?.enabled) {
    return 'Does not repeat';
  }

  const weekdayLabels = {
    MO: 'Mon',
    TU: 'Tue',
    WE: 'Wed',
    TH: 'Thu',
    FR: 'Fri',
    SA: 'Sat',
    SU: 'Sun',
  };

  const sortedDays = [...(recurrence.byWeekdays || [])].sort(
    (a, b) => getWeekdayOrder(a) - getWeekdayOrder(b)
  );

  const dayNames = sortedDays.map((code) => weekdayLabels[code]).join(', ');

  let summary = `Repeats every ${recurrence.interval} week${
    recurrence.interval > 1 ? 's' : ''
  }`;

  if (dayNames) {
    summary += ` on ${dayNames}`;
  }

  if (recurrence.endType === 'on' && recurrence.until) {
    summary += ` until ${recurrence.until}`;
  } else if (recurrence.endType === 'after') {
    summary += ` for ${recurrence.count} occurrence${
      recurrence.count !== 1 ? 's' : ''
    }`;
  }

  return summary;
}

function getInitialRecurrence(initialData) {
  if (!initialData?.recurrence_rule) {
    return {
      enabled: false,
      frequency: 'weekly',
      interval: 1,
      byWeekdays: [],
      endType: 'never',
      until: '',
      count: 13,
    };
  }

  try {
    const parsed =
      typeof initialData.recurrence_rule === 'string'
        ? JSON.parse(initialData.recurrence_rule)
        : initialData.recurrence_rule;

    return {
      enabled: Boolean(parsed?.enabled),
      frequency: parsed?.frequency || 'weekly',
      interval: parsed?.interval || 1,
      byWeekdays: Array.isArray(parsed?.byWeekdays) ? parsed.byWeekdays : [],
      endType: parsed?.endType || 'never',
      until: parsed?.until || '',
      count: parsed?.count || 13,
    };
  } catch {
    return {
      enabled: false,
      frequency: 'weekly',
      interval: 1,
      byWeekdays: [],
      endType: 'never',
      until: '',
      count: 13,
    };
  }
}

export default function CreateAvailabilityModal({
  onClose,
  onSubmit,
  defaultVisibility = 'private',
  title = 'Create availability',
  submitLabel = 'Create slot',
  initialData = null,
}) {
  const today = toLocalDateInputValue(new Date());
  const initialDate = initialData?.start_time ? toLocalDateInputValue(initialData.start_time) : today;

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

  const [recurrence, setRecurrence] = useState(() =>
    getInitialRecurrence(initialData)
  );
  const [recurrenceModalOpen, setRecurrenceModalOpen] = useState(false);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function resetRecurrence() {
    setRecurrence({
      enabled: false,
      frequency: 'weekly',
      interval: 1,
      byWeekdays: [],
      endType: 'never',
      until: '',
      count: 13,
    });
  }

  function resetForm() {
    setForm({
      av_title: '',
      av_description: '',
      date: today,
      start_time: '10:00',
      end_time: '10:30',
      location: '',
      capacity: 1,
      visibility: defaultVisibility,
      slot_duration_minutes: 30,
    });
  }

  function updateField(key, value) {
    setForm((prev) => ({
      ...prev,
      [key]: value,
    }));
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

    if (
      !Number.isInteger(Number(form.slot_duration_minutes)) ||
      Number(form.slot_duration_minutes) < 1
    ) {
      setError('Slot duration must be a positive integer.');
      return;
    }

    if (recurrence.enabled) {
      if (!Array.isArray(recurrence.byWeekdays) || recurrence.byWeekdays.length === 0) {
        setError('Recurrence: Select at least one weekday.');
        return;
      }

      if (!Number.isInteger(Number(recurrence.interval)) || Number(recurrence.interval) < 1) {
        setError('Recurrence: Interval must be at least 1.');
        return;
      }

      if (recurrence.endType === 'on' && !recurrence.until) {
        setError('Recurrence: Select an end date.');
        return;
      }

      if (
        recurrence.endType === 'after' &&
        (!Number.isInteger(Number(recurrence.count)) || Number(recurrence.count) < 1)
      ) {
        setError('Recurrence: Occurrences must be at least 1.');
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

      console.log('[CreateAvailabilityModal] recurrence_rule payload:', recurrencePayload);

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

      resetForm();
      resetRecurrence();
      setRecurrenceModalOpen(false);
    } catch (err) {
      setError(err?.message || 'Failed to create availability.');
    } finally {
      setSaving(false);
    }
  }

  function handleRecurrenceClose() {
    setRecurrenceModalOpen(false);
  }

  function handleRecurrenceSave(newRecurrence) {
    setRecurrence(newRecurrence);
    setRecurrenceModalOpen(false);
  }

  function handleModalClose() {
    resetRecurrence();
    setRecurrenceModalOpen(false);
    setError('');
    onClose();
  }

  function handleOverlayClick(e) {
    if (e.target === e.currentTarget) {
      handleModalClose();
    }
  }

  return (
    <div
      className="availability-modal-overlay"
      onMouseDown={handleOverlayClick}
    >
      <div
        className="availability-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="availability-modal-header">
          <h2>{title}</h2>
          <button
            type="button"
            className="availability-close-btn"
            onClick={handleModalClose}
            aria-label="Close modal"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="availability-form-grid">
          <div className="form-group form-group-full">
            <label htmlFor="av_title">Title</label>
            <input
              id="av_title"
              type="text"
              value={form.av_title}
              onChange={(e) => updateField('av_title', e.target.value)}
              placeholder="Office hours"
            />
          </div>

          <div className="form-group form-group-full">
            <label htmlFor="av_description">Description</label>
            <textarea
              id="av_description"
              value={form.av_description}
              onChange={(e) => updateField('av_description', e.target.value)}
              placeholder="Optional details"
              rows={3}
            />
          </div>

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
            <label htmlFor="visibility">Visibility</label>
            <select
              id="visibility"
              value={form.visibility}
              onChange={(e) => updateField('visibility', e.target.value)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          <div className="form-group">
            <label>Recurrence</label>
            <div className="recurrence-display">
              <span className="recurrence-summary">
                {getRecurrenceSummary(recurrence)}
              </span>
              <button
                type="button"
                className="recurrence-edit-btn"
                onClick={() => setRecurrenceModalOpen(true)}
              >
                Custom...
              </button>
            </div>
          </div>

          <RecurrenceModal
            isOpen={recurrenceModalOpen}
            onClose={handleRecurrenceClose}
            onSave={handleRecurrenceSave}
            initialRecurrence={recurrence}
            baseDate={form.date}
          />

          {error && (
            <p className="create-av-error form-group-full">
              {error}
            </p>
          )}

          <div className="availability-modal-footer form-group-full">
            <button
              type="button"
              className="modal-btn secondary"
              onClick={handleModalClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn primary"
              disabled={saving}
            >
              {saving ? `${submitLabel}...` : submitLabel}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}