import React, { useState } from 'react';
import '../styles/CreateAvailabilityModal.css';

function toIsoLocal(date, time) {
  return `${date}T${time}:00`;
}

export default function CreateAppointmentModal({ onClose, onSubmit, defaultVisibility = 'public' }) {
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    ap_title: '',
    ap_description: '',
    date: today,
    start_time: '10:00',
    end_time: '10:30',
    location: '',
    capacity: 1,
    visibility: defaultVisibility,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
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
        ap_title: form.ap_title.trim() || null,
        ap_description: form.ap_description.trim() || null,
        start_time: start,
        end_time: end,
        location: form.location.trim() || null,
        capacity: Number(form.capacity),
        visibility: form.visibility,
      });
    } catch (err) {
      setError(err.message || 'Failed to create appointment.');
    } finally {
      setSaving(false);
    }
  }

  function handleOverlayMouseDown(e) {
    if (e.target === e.currentTarget) onClose();
  }

  return (
    <div className="availability-modal-overlay" onMouseDown={handleOverlayMouseDown}>
      <div className="availability-modal" onMouseDown={(e) => e.stopPropagation()}>
        <div className="availability-modal-header">
          <h2>Create appointment</h2>
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
            <label htmlFor="ap_title">Title</label>
            <input
              id="ap_title"
              type="text"
              value={form.ap_title}
              onChange={(e) => updateField('ap_title', e.target.value)}
              placeholder="Course event"
            />
          </div>

          <div className="form-group form-group-full">
            <label htmlFor="ap_description">Description</label>
            <textarea
              id="ap_description"
              value={form.ap_description}
              onChange={(e) => updateField('ap_description', e.target.value)}
              placeholder="Optional details"
              rows={3}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ap_date">Date</label>
            <input
              id="ap_date"
              type="date"
              value={form.date}
              onChange={(e) => updateField('date', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ap_location">Location</label>
            <input
              id="ap_location"
              type="text"
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Trottier 3xxx or Zoom"
            />
          </div>

          <div className="form-group">
            <label htmlFor="ap_start_time">Start time</label>
            <input
              id="ap_start_time"
              type="time"
              value={form.start_time}
              onChange={(e) => updateField('start_time', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ap_end_time">End time</label>
            <input
              id="ap_end_time"
              type="time"
              value={form.end_time}
              onChange={(e) => updateField('end_time', e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="ap_capacity">Capacity</label>
            <input
              id="ap_capacity"
              type="number"
              min="1"
              value={form.capacity}
              onChange={(e) => updateField('capacity', e.target.value)}
            />
          </div>

          <div className="form-group">
            <label htmlFor="ap_visibility">Visibility</label>
            <select
              id="ap_visibility"
              value={form.visibility}
              onChange={(e) => updateField('visibility', e.target.value)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </div>

          {error ? <p className="create-av-error form-group-full">{error}</p> : null}

          <div className="availability-modal-footer form-group-full">
            <button type="button" className="modal-btn secondary" onClick={onClose} disabled={saving}>
              Cancel
            </button>
            <button type="submit" className="modal-btn primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create appointment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
