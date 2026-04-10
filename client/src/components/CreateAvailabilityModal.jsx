import React, { useState } from 'react';

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
  });

  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

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
        av_title: form.av_title,
        av_description: form.av_description,
        start_time: start,
        end_time: end,
        location: form.location,
        capacity: Number(form.capacity),
        visibility: form.visibility,
        recurrence_rule: form.recurrence_rule || null,
      });
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="modal-overlay">
      <div className="create-av-modal">
        <div className="create-av-header">
          <h2>Create availability</h2>
          <button type="button" className="create-av-close" onClick={onClose}>
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="create-av-form">
          <label>
            Title
            <input
              value={form.av_title}
              onChange={(e) => updateField('av_title', e.target.value)}
              placeholder="Office hours"
            />
          </label>

          <label>
            Description
            <textarea
              value={form.av_description}
              onChange={(e) => updateField('av_description', e.target.value)}
              placeholder="Optional details"
              rows={3}
            />
          </label>

          <div className="create-av-grid">
            <label>
              Date
              <input
                type="date"
                value={form.date}
                onChange={(e) => updateField('date', e.target.value)}
              />
            </label>

            <label>
              Start time
              <input
                type="time"
                value={form.start_time}
                onChange={(e) => updateField('start_time', e.target.value)}
              />
            </label>

            <label>
              End time
              <input
                type="time"
                value={form.end_time}
                onChange={(e) => updateField('end_time', e.target.value)}
              />
            </label>

            <label>
              Capacity
              <input
                type="number"
                min="1"
                value={form.capacity}
                onChange={(e) => updateField('capacity', e.target.value)}
              />
            </label>
          </div>

          <label>
            Location
            <input
              value={form.location}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder="Trottier 3xxx or Zoom"
            />
          </label>

          <label>
            Visibility
            <select
              value={form.visibility}
              onChange={(e) => updateField('visibility', e.target.value)}
            >
              <option value="private">Private</option>
              <option value="public">Public</option>
            </select>
          </label>

          <label>
            Recurrence rule
            <input
              value={form.recurrence_rule}
              onChange={(e) => updateField('recurrence_rule', e.target.value)}
              placeholder="Optional for later"
            />
          </label>

          {error && <p className="create-av-error">{error}</p>}

          <div className="create-av-actions">
            <button type="button" className="create-av-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="create-av-primary" disabled={saving}>
              {saving ? 'Creating...' : 'Create slot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}