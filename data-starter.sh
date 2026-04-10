#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

DB_PATH="$ROOT_DIR/server/database/app.db"
SCHEMA_PATH="$ROOT_DIR/server/database/booking_schema.sql"

if ! command -v sqlite3 >/dev/null 2>&1; then
  echo "Error: sqlite3 is required but not installed." >&2
  exit 1
fi

echo "=== LGTM Data Starter Script ==="

echo "Rebuilding database schema in place..."
sqlite3 "$DB_PATH" < "$SCHEMA_PATH"

echo "Seeding sample users, availabilities, and appointments..."

SQL_SEED=$(cat <<'EOF'
BEGIN TRANSACTION;

-- =========================================================
-- USERS (ONLY 2)
-- =========================================================
INSERT INTO users (
  first_name,
  last_name,
  mcgill_email,
  user_type,
  password_hash,
  department,
  staff_title
)
VALUES
  ('James', 'Mitchell', 'james.mitchell@mcgill.ca', 'course_admin', 'password', 'Computer Science', 'Professor'),
  ('Alice', 'Thompson', 'alice.thompson@mail.mcgill.ca', 'student', 'password', 'Computer Science', NULL);

INSERT INTO availabilities (
  created_by,
  location,
  capacity,
  start_time,
  end_time,
  visibility,
  av_title,
  av_description
)
VALUES
  -- 30 min
  (1, 'Trottier 3100', 1,
    date('now', '+1 day') || ' 09:00:00',
    date('now', '+1 day') || ' 09:30:00',
    'public',
    'Office Hours',
    'Short meeting for quick questions about lectures.'),

  -- 1 hour
  (1, 'Trottier 3100', 1,
    date('now', '+1 day') || ' 10:00:00',
    date('now', '+1 day') || ' 11:00:00',
    'public',
    'Midterm Review Session',
    'Detailed discussion on midterm topics and problem-solving strategies.'),

  -- 2 hours
  (1, 'Zoom', 2,
    date('now', '+1 day') || ' 14:00:00',
    date('now', '+1 day') || ' 16:00:00',
    'public',
    'Project Work Session',
    'Extended meeting to review implementation and debug project issues.'),

  -- 30 min
  (1, 'Trottier 3110', 1,
    date('now', '+2 day') || ' 09:30:00',
    date('now', '+2 day') || ' 10:00:00',
    'public',
    'Quiz Feedback',
    'Going over quiz mistakes and clarifications.'),

  -- 1 hour
  (1, 'Trottier 3110', 1,
    date('now', '+2 day') || ' 11:00:00',
    date('now', '+2 day') || ' 12:00:00',
    'public',
    'Assignment Help',
    'Discussion on assignment requirements and debugging help.'),

  -- 2 hours
  (1, 'Zoom', 2,
    date('now', '+2 day') || ' 15:00:00',
    date('now', '+2 day') || ' 17:00:00',
    'public',
    'Final Exam Review Marathon',
    'Comprehensive review session covering all major course topics.'),

  -- 30 min
  (1, 'Trottier 2120', 1,
    date('now', '+3 day') || ' 10:00:00',
    date('now', '+3 day') || ' 10:30:00',
    'public',
    'Quick Office Hour',
    'Short slot for one or two targeted questions.'),

  -- 1 hour
  (1, 'Zoom', 1,
    date('now', '+3 day') || ' 13:00:00',
    date('now', '+3 day') || ' 14:00:00',
    'public',
    'Project Check-In',
    'Progress update and planning next steps for the project.'),

  -- 2 hours
  (1, 'Trottier 2120', 2,
    date('now', '+3 day') || ' 16:00:00',
    date('now', '+3 day') || ' 18:00:00',
    'public',
    'Seminar Discussion',
    'Long-form discussion on readings and research topics.'),

  -- 1 hour
  (1, 'Zoom', 1,
    date('now', '+4 day') || ' 09:00:00',
    date('now', '+4 day') || ' 10:00:00',
    'public',
    'Final Project Guidance',
    'Discuss scope, architecture, and deliverables.'),

  -- 30 min
  (1, 'Trottier 3100', 1,
    date('now', '+4 day') || ' 11:00:00',
    date('now', '+4 day') || ' 11:30:00',
    'public',
    'Reference Letter Meeting',
    'Short discussion about academic goals and background.'),

  -- 2 hours
  (1, 'Zoom', 2,
    date('now', '+4 day') || ' 14:00:00',
    date('now', '+4 day') || ' 16:00:00',
    'public',
    'Course Planning Session',
    'Detailed discussion about course selection and academic planning.');

INSERT INTO appointments (
  course_id,
  created_from_availability,
  capacity,
  location,
  start_time,
  end_time,
  visibility,
  ap_title,
  ap_description,
  scheduling_mode,
  status
)
VALUES
  -- 30 min
  (NULL, NULL, 1, 'Trottier 3100',
    date('now') || ' 15:00:00',
    date('now') || ' 15:30:00',
    'public',
    'Office Hours',
    'Follow-up questions from lecture.',
    'calendar',
    'confirmed'),

  -- 1 hour
  (NULL, NULL, 1, 'Zoom',
    date('now', '+1 day') || ' 11:00:00',
    date('now', '+1 day') || ' 12:00:00',
    'public',
    'Midterm Review',
    'Preparing for upcoming midterm exam.',
    'calendar',
    'confirmed'),

  -- 2 hours
  (NULL, NULL, 1, 'Trottier 3110',
    date('now', '+1 day') || ' 13:00:00',
    date('now', '+1 day') || ' 15:00:00',
    'public',
    'Project Debugging Session',
    'Extended session to debug major project issues.',
    'calendar',
    'confirmed'),

  -- 30 min
  (NULL, NULL, 1, 'Zoom',
    date('now', '+2 day') || ' 14:00:00',
    date('now', '+2 day') || ' 14:30:00',
    'public',
    'Quiz Review',
    'Quick review of quiz mistakes.',
    'calendar',
    'confirmed'),

  -- 1 hour
  (NULL, NULL, 1, 'Trottier 2120',
    date('now', '+2 day') || ' 16:00:00',
    date('now', '+2 day') || ' 17:00:00',
    'public',
    'Assignment Help',
    'Detailed help session for assignment questions.',
    'calendar',
    'confirmed'),

  -- 2 hours
  (NULL, NULL, 1, 'Zoom',
    date('now', '+3 day') || ' 11:00:00',
    date('now', '+3 day') || ' 13:00:00',
    'public',
    'Final Exam Review',
    'Comprehensive review of all course material.',
    'calendar',
    'confirmed'),

  -- cancelled (1 hour)
  (NULL, NULL, 1, 'Zoom',
    date('now', '+2 day') || ' 09:00:00',
    date('now', '+2 day') || ' 10:00:00',
    'public',
    'Cancelled Office Hour',
    'Meeting cancelled after issue was resolved.',
    'calendar',
    'cancelled');

-- =========================================================
-- PARTICIPANTS
-- =========================================================
INSERT INTO appointment_participants (
  appointment_id,
  user_id,
  participant_role,
  response_status
)
VALUES
  (1,1,'host','accepted'), (1,2,'attendee','accepted'),
  (2,1,'host','accepted'), (2,2,'attendee','accepted'),
  (3,1,'host','accepted'), (3,2,'attendee','accepted'),
  (4,1,'host','accepted'), (4,2,'attendee','accepted'),
  (5,1,'host','accepted'), (5,2,'attendee','accepted'),
  (6,1,'host','accepted'), (6,2,'attendee','accepted'),
  (7,1,'host','accepted'), (7,2,'attendee','accepted'),
  (8,1,'host','accepted'), (8,2,'attendee','accepted'),
  (9,1,'host','accepted'), (9,2,'attendee','accepted'),
  (10,1,'host','accepted'), (10,2,'attendee','accepted'),
  (11,1,'host','accepted'), (11,2,'attendee','accepted');

-- =========================================================
-- HISTORY
-- =========================================================
INSERT INTO appointment_history (
  appointment_id,
  changed_by,
  old_status,
  new_status,
  note
)
VALUES
  (1,2,NULL,'confirmed','Initial seeded booking'),
  (2,2,NULL,'confirmed','Initial seeded booking'),
  (3,2,NULL,'confirmed','Initial seeded booking'),
  (4,2,NULL,'confirmed','Initial seeded booking'),
  (5,2,NULL,'confirmed','Initial seeded booking'),
  (6,2,NULL,'confirmed','Initial seeded booking'),
  (7,2,NULL,'confirmed','Initial seeded booking'),
  (8,2,NULL,'confirmed','Initial seeded booking'),
  (9,2,NULL,'confirmed','Initial seeded booking'),
  (10,2,NULL,'cancelled','Seeded cancelled case'),
  (11,2,NULL,'cancelled','Seeded cancelled case');

COMMIT;
EOF
)

printf '%s
' "$SQL_SEED" | sqlite3 "$DB_PATH"

echo "Database seeded to $DB_PATH"
echo "Professor UID: 1"
echo "Student UID: 2"
echo "If the backend server is already running, restart it so it uses the rebuilt database."
