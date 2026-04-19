import { useState } from 'react';
import '../styles/CreateAvailabilityModal.css';

const TERMS = ['Winter', 'Fall', 'Summer'];

export default function CreateCourseModal({ onClose, onSubmit }) {
  const defaultYear = String(new Date().getFullYear());
  const [form, setForm] = useState({
    course_code: '',
    course_name: '',
    course_term: 'Winter',
    course_year: defaultYear,
    description: '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  function updateField(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    const course_code = form.course_code.trim();
    const course_name = form.course_name.trim();
    const course_term = form.course_term.trim();
    const year = parseInt(form.course_year, 10);

    if (!course_code || !course_name || !course_term) {
      setError('Course code, name, and term are required.');
      return;
    }
    if (Number.isNaN(year)) {
      setError('Enter a valid year.');
      return;
    }

    const description = form.description.trim();

    try {
      setSaving(true);
      await onSubmit({
        course_code,
        course_name,
        course_term,
        course_year: year,
        ...(description ? { description } : {}),
      });
    } catch (err) {
      setError(err.message || 'Failed to create course.');
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="create-course-title"
      >
        <div className="availability-modal-header">
          <h2 id="create-course-title">Create course</h2>
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
          <div className="form-group">
            <label htmlFor="course_code">Course code</label>
            <input
              id="course_code"
              type="text"
              value={form.course_code}
              onChange={(e) => updateField('course_code', e.target.value)}
              placeholder="e.g. COMP 307"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="course_name">Course name</label>
            <input
              id="course_name"
              type="text"
              value={form.course_name}
              onChange={(e) => updateField('course_name', e.target.value)}
              placeholder="Course title"
              autoComplete="off"
            />
          </div>
          <div className="form-group">
            <label htmlFor="course_term">Term</label>
            <select
              id="course_term"
              value={form.course_term}
              onChange={(e) => updateField('course_term', e.target.value)}
            >
              {TERMS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="form-group">
            <label htmlFor="course_year">Year</label>
            <input
              id="course_year"
              type="number"
              min="2000"
              max="2100"
              value={form.course_year}
              onChange={(e) => updateField('course_year', e.target.value)}
            />
          </div>
          <div className="form-group form-group-full">
            <label htmlFor="course_description">Description (optional)</label>
            <textarea
              id="course_description"
              rows={3}
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              placeholder="Short description"
            />
          </div>

          {error && (
            <div className="form-group-full" style={{ color: '#b00020', fontSize: '13px' }}>
              {error}
            </div>
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
            <button type="submit" className="modal-btn primary" disabled={saving}>
              {saving ? 'Creating…' : 'Create course'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
