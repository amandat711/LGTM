import { useEffect, useMemo, useState } from 'react';
import Button from '@mui/material/Button';
import { getUsers } from '../api/users';
import { ConfirmActionModal, Modal } from './Modals';
import '../styles/CreateAvailabilityModal.css';
import '../styles/CourseSettingsModal.css';

function userTypeLabel(userType) {
  if (userType === 'student') return 'Student';
  if (userType === 'course_admin') return 'Faculty';
  if (userType === 'general_admin') return 'Faculty';
  return userType || '';
}

function staffUserKey(id) {
  return String(id);
}

function searchUserToPendingStaffRow(u) {
  const name = (u.name || '').trim();
  const parts = name.split(/\s+/);
  return {
    user_id: u.id,
    first_name: parts[0] || 'User',
    last_name: parts.slice(1).join(' ') || '',
    mcgill_email: u.email,
    user_type: u.userType,
  };
}

export default function CourseSettingsModal({
  course,
  staff = [],
  staffIdSet,
  onSaveCourse,
  onAssign,
  onRevoke,
  onDeleteCourse,
  onCloseCourse,
  closing,
  onAfterSettingsSave,
  deleting,
  onClose,
}) {
  const [form, setForm] = useState({
    course_name: course?.course_name ?? '',
    description: course?.description ?? '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  /** User IDs marked for revoke; applied when "Save course info" succeeds. */
  const [pendingRevokeIds, setPendingRevokeIds] = useState(() => new Set());
  /** New admins (from search); applied when "Save course info" succeeds. */
  const [pendingAdds, setPendingAdds] = useState([]);

  const [emailQuery, setEmailQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showCloseConfirm, setShowCloseConfirm] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const pendingAddIdSet = useMemo(() => {
    const s = new Set();
    pendingAdds.forEach((row) => s.add(staffUserKey(row.user_id)));
    return s;
  }, [pendingAdds]);

  useEffect(() => {
    setForm({
      course_name: course?.course_name ?? '',
      description: course?.description ?? '',
    });
  }, [course?.course_id, course?.course_name, course?.description]);

  useEffect(() => {
    setPendingRevokeIds(new Set());
    setPendingAdds([]);
  }, [course?.course_id]);

  useEffect(() => {
    const t = emailQuery.trim();
    if (t.length < 2) {
      setSearchResults([]);
      return;
    }
    let cancelled = false;
    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const list = await getUsers({ q: t });
        if (cancelled) return;
        setSearchResults(Array.isArray(list) ? list : []);
      } catch {
        if (!cancelled) setSearchResults([]);
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [emailQuery]);

  async function handleSubmitCourse(e) {
    e.preventDefault();
    setError('');
    const course_name = form.course_name.trim();
    if (!course_name) {
      setError('Course name is required.');
      return;
    }
    const idsToRevoke = [...pendingRevokeIds];
    const rowsToAdd = [...pendingAdds];
    try {
      setSaving(true);
      await onSaveCourse({
        course_name,
        description: form.description.trim() || null,
      });
      for (const key of idsToRevoke) {
        await onRevoke(key);
        setPendingRevokeIds((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
      for (const row of rowsToAdd) {
        const k = staffUserKey(row.user_id);
        await onAssign(row.user_id);
        setPendingAdds((prev) => prev.filter((p) => staffUserKey(p.user_id) !== k));
      }
      if (onAfterSettingsSave) {
        await onAfterSettingsSave();
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Could not save.');
    } finally {
      setSaving(false);
    }
  }

  function stageAddFromSearch(u) {
    const key = staffUserKey(u.id);
    if (staffIdSet.has(key) || pendingAddIdSet.has(key)) return;
    setError('');
    setPendingAdds((prev) => [...prev, searchUserToPendingStaffRow(u)]);
    setEmailQuery('');
    setSearchResults([]);
  }

  function unstagePendingAdd(userId) {
    setError('');
    const key = staffUserKey(userId);
    setPendingAdds((prev) => prev.filter((p) => staffUserKey(p.user_id) !== key));
  }

  function stageRevoke(userId) {
    setError('');
    const k = staffUserKey(userId);
    setPendingRevokeIds((prev) => new Set(prev).add(k));
  }

  function unstageRevoke(userId) {
    setError('');
    const k = staffUserKey(userId);
    setPendingRevokeIds((prev) => {
      const next = new Set(prev);
      next.delete(k);
      return next;
    });
  }

  async function handleDeleteCourseConfirm() {
    setError('');
    try {
      await onDeleteCourse();
      setShowDeleteConfirm(false);
    } catch (err) {
      setError(err.message || 'Could not delete course.');
    }
  }

  async function handleCloseCourseConfirm() {
    if (!onCloseCourse) return;
    setError('');
    try {
      await onCloseCourse();
      if (onAfterSettingsSave) {
        await onAfterSettingsSave();
      }
      setShowCloseConfirm(false);
      onClose();
    } catch (err) {
      setError(err.message || 'Could not close course.');
    }
  }

  const hasStaffRows =
    (Array.isArray(staff) && staff.length > 0) || pendingAdds.length > 0;

  return (
    <Modal
      title="Course settings"
      onClose={onClose}
      className="availability-modal course-settings-modal create-item-modal"
      meta={
        <>
          <span className="modal-kind-pill modal-kind-pill--event">Course</span>
          {course?.course_code ? (
            <span className="modal-kind-pill modal-kind-pill--course">Course: {course.course_code}</span>
          ) : null}
        </>
      }
    >
      <form onSubmit={handleSubmitCourse} className="availability-form-grid">
          <div className="form-group form-group-full">
            <label htmlFor="settings_course_name">Course name</label>
            <input
              id="settings_course_name"
              value={form.course_name}
              onChange={(e) => setForm((f) => ({ ...f, course_name: e.target.value }))}
              required
            />
          </div>
          <div className="form-group form-group-full">
            <label htmlFor="settings_description">Description</label>
            <textarea
              id="settings_description"
              rows={4}
              value={form.description}
              onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
              placeholder="Optional"
            />
          </div>

          <div className="course-settings-section form-group-full">
            <h3 className="course-settings-section-title">Course admins</h3>
            <p className="course-settings-hint">
              Search by McGill email and click a name to add them here. Revoke removes access. New admins and revokes
              are saved when you click &quot;Save course info&quot;.
            </p>

            {hasStaffRows ? (
              <ul className="course-settings-staff-list">
                {staff.map((s) => {
                  const pending = pendingRevokeIds.has(staffUserKey(s.user_id));
                  return (
                    <li
                      key={s.user_id}
                      className={`course-settings-staff-row${pending ? ' course-settings-staff-row--pending-revoke' : ''}`}
                    >
                      <span className="course-settings-staff-name">
                        {s.first_name} {s.last_name}
                        <span className="course-settings-staff-meta">
                          {s.mcgill_email}
                          {s.user_type === 'student'
                            ? ' · Student'
                            : s.user_type
                              ? ` · ${userTypeLabel(s.user_type)}`
                              : ''}
                          {pending ? (
                            <span className="course-settings-pending-revoke-note"> · Removed when you save</span>
                          ) : null}
                        </span>
                      </span>
                      {pending ? (
                        <button
                          type="button"
                          className="course-settings-undo-revoke-btn"
                          onClick={() => unstageRevoke(s.user_id)}
                          disabled={saving}
                        >
                          Undo
                        </button>
                      ) : (
                        <button
                          type="button"
                          className="course-settings-revoke-btn"
                          onClick={() => stageRevoke(s.user_id)}
                          disabled={saving}
                        >
                          Revoke
                        </button>
                      )}
                    </li>
                  );
                })}
                {pendingAdds.map((s) => (
                  <li
                    key={`pending-add-${staffUserKey(s.user_id)}`}
                    className="course-settings-staff-row course-settings-staff-row--pending-add"
                  >
                    <span className="course-settings-staff-name">
                      {s.first_name} {s.last_name}
                      <span className="course-settings-staff-meta">
                        {s.mcgill_email}
                        {s.user_type === 'student'
                          ? ' · Student'
                          : s.user_type
                            ? ` · ${userTypeLabel(s.user_type)}`
                            : ''}
                        <span className="course-settings-pending-add-note"> · Added when you save</span>
                      </span>
                    </span>
                    <button
                      type="button"
                      className="course-settings-undo-revoke-btn"
                      onClick={() => unstagePendingAdd(s.user_id)}
                      disabled={saving}
                    >
                      Remove
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="course-settings-empty">No course admins besides you.</p>
            )}

            <div className="course-settings-search-block">
              <label className="course-settings-search-label" htmlFor="course-admin-email-search">
                Add by McGill email (students &amp; faculty)
              </label>
              <input
                id="course-admin-email-search"
                type="search"
                className="course-settings-search-input"
                placeholder="e.g. @mail.mcgill.ca or @mcgill.ca"
                value={emailQuery}
                onChange={(e) => setEmailQuery(e.target.value)}
                autoComplete="off"
                disabled={saving}
              />
              {searching ? (
                <p className="course-settings-search-status">Searching…</p>
              ) : null}
              {emailQuery.trim().length >= 2 && !searching && searchResults.length === 0 ? (
                <p className="course-settings-search-status">No matching users.</p>
              ) : null}
              {searchResults.length > 0 && (
                <ul className="course-settings-search-results" role="listbox">
                  {searchResults.map((u) => {
                    const key = staffUserKey(u.id);
                    const alreadyStaff = staffIdSet.has(key);
                    const alreadyPending = pendingAddIdSet.has(key);
                    const disabledHit = alreadyStaff || alreadyPending || saving;
                    return (
                      <li key={u.id}>
                        <button
                          type="button"
                          className="course-settings-search-hit"
                          disabled={disabledHit}
                          onClick={() => stageAddFromSearch(u)}
                        >
                          <span className="course-settings-hit-name">{u.name}</span>
                          <span className="course-settings-hit-email">{u.email}</span>
                          {!alreadyStaff && !alreadyPending && u.userType ? (
                            <span className="course-settings-hit-role">{userTypeLabel(u.userType)}</span>
                          ) : null}
                          {alreadyStaff ? (
                            <span className="course-settings-hit-note">Already on teaching staff</span>
                          ) : null}
                          {alreadyPending ? (
                            <span className="course-settings-hit-note">Already in your list</span>
                          ) : null}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="course-settings-section course-settings-danger form-group-full">
            {!course?.is_closed && (
              <button
                type="button"
                className="course-settings-delete-btn"
                onClick={() => setShowCloseConfirm(true)}
                disabled={closing}
                style={{ marginBottom: 10 }}
              >
                {closing ? 'Closing…' : 'Close course'}
              </button>
            )}
            <button
              type="button"
              className="course-settings-delete-btn"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={deleting}
            >
              {deleting ? 'Deleting…' : 'Delete course'}
            </button>
          </div>

          {error ? (
            <p className="form-group-full" style={{ color: '#b00020', fontSize: 13, margin: 0 }}>
              {error}
            </p>
          ) : null}

          <div className="availability-modal-footer form-group-full">
            <Button type="button" variant="text" onClick={onClose} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" variant="contained" disabled={saving}>
              {saving ? 'Saving…' : 'Save course info'}
            </Button>
          </div>
      </form>
      {showCloseConfirm && (
        <ConfirmActionModal
          title="Close this course?"
          message="Closing this course will move it to Archived in course list views."
          details={[
            { label: 'Course', value: `${course?.course_code || ''} ${course?.course_name || ''}`.trim() || 'Current course' },
          ]}
          confirmLabel="Close course"
          danger
          isWorking={Boolean(closing)}
          onConfirm={handleCloseCourseConfirm}
          onClose={() => setShowCloseConfirm(false)}
        />
      )}
      {showDeleteConfirm && (
        <ConfirmActionModal
          title="Delete this course?"
          message="This will permanently remove the course and cannot be undone."
          details={[
            { label: 'Course', value: `${course?.course_code || ''} ${course?.course_name || ''}`.trim() || 'Current course' },
          ]}
          confirmLabel="Delete course"
          danger
          isWorking={Boolean(deleting)}
          onConfirm={handleDeleteCourseConfirm}
          onClose={() => setShowDeleteConfirm(false)}
        />
      )}
    </Modal>
  );
}
