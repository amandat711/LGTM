import React, { useEffect, useMemo, useState } from 'react';
import { getCourses } from '../api/courses';
import '../styles/CreateAvailabilityModal.css';

function toIsoLocal(date, time) {
  return `${date}T${time}:00`;
}

function deriveInitialForm(defaultVisibility, initialData) {
  const today = new Date().toISOString().slice(0, 10);
  const base = {
    ap_title: '',
    ap_description: '',
    date: today,
    start_time: '10:00',
    end_time: '10:30',
    location: '',
    capacity: 1,
    visibility: defaultVisibility,
    course_id: '',
  };

  if (!initialData) return base;

  const start = initialData.start_time ? new Date(String(initialData.start_time).replace(' ', 'T')) : null;
  const end = initialData.end_time ? new Date(String(initialData.end_time).replace(' ', 'T')) : null;
  const toDate = (d) => (d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : today);
  const toTime = (d, fallback) => (d && !Number.isNaN(d.getTime()) ? d.toTimeString().slice(0, 5) : fallback);

  return {
    ap_title: initialData.ap_title || '',
    ap_description: initialData.ap_description || '',
    date: toDate(start),
    start_time: toTime(start, '10:00'),
    end_time: toTime(end, '10:30'),
    location: initialData.location || '',
    capacity: Number(initialData.capacity || 1),
    visibility: initialData.visibility || defaultVisibility,
    course_id: initialData.course_id != null ? String(initialData.course_id) : '',
  };
}

export default function CreateAppointmentModal({
  onClose,
  onSubmit,
  defaultVisibility = 'public',
  initialData = null,
  mode = 'create',
  forcedCourse = null,
}) {
  const [form, setForm] = useState({
    ...deriveInitialForm(defaultVisibility, initialData),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [allCourses, setAllCourses] = useState([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [courseSearch, setCourseSearch] = useState('');

  useEffect(() => {
    if (!forcedCourse) {
      setCoursesLoading(true);
      getCourses()
        .then((data) => {
          const list = Array.isArray(data?.courses) ? data.courses : [];
          setAllCourses(list);
        })
        .catch(() => {
          setAllCourses([]);
        })
        .finally(() => setCoursesLoading(false));
    }
  }, [forcedCourse]);

  useEffect(() => {
    if (forcedCourse?.course_id != null) {
      setForm((prev) => ({ ...prev, course_id: String(forcedCourse.course_id) }));
      return;
    }
    if (initialData?.course_id != null) {
      setForm((prev) => ({ ...prev, course_id: String(initialData.course_id) }));
    }
  }, [forcedCourse, initialData]);

  const filteredCourses = useMemo(() => {
    const q = courseSearch.trim().toLowerCase();
    if (!q) return allCourses;
    return allCourses.filter((course) => {
      const code = String(course.course_code || '').toLowerCase();
      const name = String(course.course_name || '').toLowerCase();
      const term = String(course.course_term || '').toLowerCase();
      const year = String(course.course_year || '').toLowerCase();
      return code.includes(q) || name.includes(q) || term.includes(q) || year.includes(q);
    });
  }, [allCourses, courseSearch]);

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
        course_id: form.course_id ? Number(form.course_id) : null,
      });
    } catch (err) {
      setError(err.message || `Failed to ${mode === 'edit' ? 'update' : 'create'} appointment.`);
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
          <h2>{mode === 'edit' ? 'Edit appointment' : 'Create appointment'}</h2>
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

          <div className="form-group form-group-full">
            <label htmlFor="ap_course">Course</label>
            {forcedCourse ? (
              <>
                <input
                  id="ap_course"
                  type="text"
                  value={`${forcedCourse.course_code || ''} ${forcedCourse.course_name || ''}`.trim() || `Course ${forcedCourse.course_id}`}
                  readOnly
                />
                <small>This appointment is locked to this course when created from a course page.</small>
              </>
            ) : (
              <>
                <input
                  id="ap_course_search"
                  type="text"
                  value={courseSearch}
                  onChange={(e) => setCourseSearch(e.target.value)}
                  placeholder="Search by code, name, term, year"
                />
                <select
                  id="ap_course"
                  value={form.course_id}
                  onChange={(e) => updateField('course_id', e.target.value)}
                >
                  <option value="">No course</option>
                  {filteredCourses.map((course) => (
                    <option key={course.course_id} value={course.course_id}>
                      {course.course_code} - {course.course_name} ({course.course_term} {course.course_year})
                    </option>
                  ))}
                </select>
                {coursesLoading ? <small>Loading courses...</small> : null}
              </>
            )}
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
              {saving ? (mode === 'edit' ? 'Saving...' : 'Creating...') : (mode === 'edit' ? 'Save changes' : 'Create appointment')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
