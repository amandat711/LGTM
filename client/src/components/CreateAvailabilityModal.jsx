import React, { useState } from 'react';
import '../styles/CreateAvailabilityModal.css';

function toIsoLocal(date, time) {
  return `${date}T${time}:00`;
}

export default function CreateAvailabilityModal({ onClose, onSubmit }) {
  const today = new Date().toISOString().slice(0, 10);

  const [form, setForm] = useState({
    av_title: '',
    av_description: '',
    date: today,
    start_time: '10:00',
    end_time: '10:30',
    location: '',
    capacity: 1,
    visibility: 'private',
    recurrence_rule: '',
    slot_duration_minutes: 30,
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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

    try {
      setSaving(true);

      await onSubmit({
        av_title: form.av_title.trim() || null,
        av_description: form.av_description.trim() || null,
        start_time: start,
        end_time: end,
        location: form.location.trim() || null,
        capacity: Number(form.capacity),
        visibility: form.visibility,
        recurrence_rule: form.recurrence_rule.trim() || null,
        slot_duration_minutes: Number(form.slot_duration_minutes),
      });
    } catch (err) {
      setError(err.message || 'Failed to create availability.');
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayMouseDown(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  return (
    <div
      className="availability-modal-overlay"
      onMouseDown={handleOverlayMouseDown}
    >
      <div
        className="availability-modal"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="availability-modal-header">
          <h2>Create availability</h2>
          <button
            type="button"
            className="availability-close-btn"
            onClick={onClose}
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
            <label htmlFor="recurrence_rule">Recurrence rule</label>
            <input
              id="recurrence_rule"
              type="text"
              value={form.recurrence_rule}
              onChange={(e) => updateField('recurrence_rule', e.target.value)}
              placeholder="Optional for later"
            />
          </div>

          {error && (
            <p className="create-av-error form-group-full">
              {error}
            </p>
          )}

          <div className="availability-modal-footer form-group-full">
            <button
              type="button"
              className="modal-btn secondary"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="modal-btn primary"
              disabled={saving}
            >
              {saving ? 'Creating...' : 'Create slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}