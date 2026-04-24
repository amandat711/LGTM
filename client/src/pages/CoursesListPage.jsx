import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import useAppShellSession from '../hooks/useAppShellSession';
import { isFacultyAdmin } from '../auth/authUtils';
import { createCourse, getCourses } from '../api/courses';
import { logout } from '../api/auth';
import Navbar from '../components/Navbar';
import AppSidebar from '../components/AppSidebar';
import CreateCourseModal from '../components/CreateCourseModal';
import logo from '../assets/LGTMLogo2.png';
import '../styles/Dashboard.css';
import '../styles/CoursesListPage.css';

const TERM_ORDER = { Winter: 1, Fall: 2, Summer: 3 };

function toSemesterLabel(course) {
  return `${course.course_term} ${course.course_year}`;
}

function compareByTermDesc(a, b) {
  if (a.course_year !== b.course_year) return b.course_year - a.course_year;
  return (TERM_ORDER[a.course_term] || 99) - (TERM_ORDER[b.course_term] || 99);
}

function buildArchiveBuckets(courses) {
  const out = {};
  courses.forEach((course) => {
    const key = toSemesterLabel(course);
    if (!out[key]) out[key] = [];
    out[key].push(course);
  });
  return out;
}

function isArchived(course) {
  return Boolean(course.is_closed);
}

function roleTag(course) {
  if (course.is_owner) return 'Owner';
  if (course.is_staff) return 'Staff';
  if (course.is_closed) return 'Archived';
  return 'Enrolled';
}

/** index 0..7 from term+year label to handle tag colors. */
const TAG_VARIANT_COUNT = 8;
function semesterTagVariant(label) {
  let h = 0;
  for (let i = 0; i < label.length; i += 1) {
    h = Math.imul(31, h) + label.charCodeAt(i);
  }
  return Math.abs(h) % TAG_VARIANT_COUNT;
}

export default function CoursesListPage() {
  const navigate = useNavigate();
  const { user } = useAppShellSession();
  const canCreate = isFacultyAdmin(user.user_type);
  const [courses, setCourses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  /** When set, only courses matching this term+year label are listed. */
  const [semesterFilter, setSemesterFilter] = useState(null);

  const currentUser = useMemo(
    () => ({
      firstName: user.first_name || 'User',
      lastName: user.last_name || '',
      role: isFacultyAdmin(user.user_type) ? 'professor' : 'student',
    }),
    [user]
  );

  useEffect(() => {
    let active = true;
    async function loadCourses() {
      try {
        setLoading(true);
        const data = await getCourses();
        if (!active) return;
        const list = Array.isArray(data.courses) ? data.courses : [];
        setCourses(list.sort(compareByTermDesc));
        setError('');
      } catch (err) {
        if (!active) return;
        setError(err.message || 'Failed to load courses.');
      } finally {
        if (active) setLoading(false);
      }
    }
    loadCourses();
    return () => {
      active = false;
    };
  }, []);

  const { activeCourses, archivedCourses, termChips } = useMemo(() => {
    const active = courses.filter((c) => !isArchived(c));
    const archived = courses.filter((c) => isArchived(c));
    const labelToCourse = new Map();
    courses.forEach((c) => {
      const key = toSemesterLabel(c);
      if (!labelToCourse.has(key)) labelToCourse.set(key, c);
    });
    const chips = [...labelToCourse.keys()].sort((a, b) =>
      compareByTermDesc(labelToCourse.get(a), labelToCourse.get(b))
    );
    return {
      activeCourses: active,
      archivedCourses: archived,
      termChips: chips,
    };
  }, [courses]);

  const filteredActiveCourses = useMemo(() => {
    if (!semesterFilter) return activeCourses;
    return activeCourses.filter((c) => toSemesterLabel(c) === semesterFilter);
  }, [activeCourses, semesterFilter]);

  const archivedBuckets = useMemo(() => {
    const list = semesterFilter
      ? archivedCourses.filter((c) => toSemesterLabel(c) === semesterFilter)
      : archivedCourses;
    return buildArchiveBuckets(list);
  }, [archivedCourses, semesterFilter]);

  const initials = `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`;

  async function handleLogout() {
    try {
      await logout();
    } finally {
      navigate('/', { replace: true });
    }
  }

  async function handleCreateCourse(payload) {
    await createCourse(payload);
    const refreshed = await getCourses();
    setCourses((refreshed.courses || []).sort(compareByTermDesc));
    setError('');
    setCreateModalOpen(false);
  }

  return (
    <div className="dashboard-page courses-list-page">
      <Navbar
        logo={logo}
        title="Course List"
        onLeftClick={() => navigate('/')}
        user={{
          displayName: `${currentUser.lastName}, ${currentUser.firstName}`,
          role: currentUser.role,
          initials,
        }}
        actions={[{ label: 'Log Out', onClick: handleLogout }]}
      />

      {createModalOpen && (
        <CreateCourseModal
          onClose={() => setCreateModalOpen(false)}
          onSubmit={handleCreateCourse}
        />
      )}

      <div className="dashboard-layout">
        <AppSidebar
          activeId="courses"
          user={user}
          navigate={navigate}
          canCreate={canCreate}
        />

        <div className="main-content">
          <section className="courses-shell">
            <div className="courses-header-row">
              <h1 className="courses-title">Course List</h1>
              {canCreate && (
                <button
                  type="button"
                  className="courses-add-btn"
                  onClick={() => setCreateModalOpen(true)}
                >
                  + Add course
                </button>
              )}
            </div>
            {termChips.length > 0 && (
              <div className="term-chip-row" role="toolbar" aria-label="Filter by semester">
                {termChips.map((chip) => {
                  const v = semesterTagVariant(chip);
                  const selected = semesterFilter === chip;
                  return (
                    <button
                      key={chip}
                      type="button"
                      className={`term-chip term-chip-btn term-chip--v${v}${selected ? ' term-chip-btn--selected' : ''}`}
                      onClick={() =>
                        setSemesterFilter((prev) => (prev === chip ? null : chip))
                      }
                      aria-pressed={selected}
                    >
                      {chip}
                    </button>
                  );
                })}
              </div>
            )}

            {loading && <p>Loading courses...</p>}
            {!loading && error && <p className="courses-error">{error}</p>}

            {!loading && !error && (
              <>
                <h2 className="courses-subtitle">Active</h2>
                <div className="course-grid">
                  {filteredActiveCourses.length === 0 && (
                    <p>
                      {semesterFilter
                        ? `No active courses for ${semesterFilter}.`
                        : 'No active courses.'}
                    </p>
                  )}
                  {filteredActiveCourses.map((course) => (
                    <button
                      key={course.course_id}
                      type="button"
                      className="course-card"
                      onClick={() => navigate(`/courses/${course.course_id}`)}
                    >
                      <div className="course-top">
                        <span
                          className={`course-term-pill course-term-pill--v${semesterTagVariant(toSemesterLabel(course))}`}
                        >
                          {toSemesterLabel(course)}
                        </span>
                        <span className="course-role-pill">{roleTag(course)}</span>
                      </div>
                      <div className="course-code">{course.course_code}</div>
                      <div className="course-name">{course.course_name}</div>
                    </button>
                  ))}
                </div>

                <h2 className="courses-subtitle">Archived</h2>
                {Object.keys(archivedBuckets).length === 0 && (
                  <p>
                    {semesterFilter
                      ? `No archived courses for ${semesterFilter}.`
                      : 'No archived courses.'}
                  </p>
                )}
                {Object.entries(archivedBuckets).map(([semester, list]) => (
                  <div key={semester} className="archive-group">
                    <h3 className="archive-label">{semester}</h3>
                    <div className="course-grid">
                      {list.map((course) => (
                        <button
                          key={course.course_id}
                          type="button"
                          className="course-card"
                          onClick={() => navigate(`/courses/${course.course_id}`)}
                        >
                          <div className="course-top">
                            <span
                              className={`course-term-pill course-term-pill--v${semesterTagVariant(toSemesterLabel(course))}`}
                            >
                              {toSemesterLabel(course)}
                            </span>
                            <span className="course-role-pill">{roleTag(course)}</span>
                          </div>
                          <div className="course-code">{course.course_code}</div>
                          <div className="course-name">{course.course_name}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
