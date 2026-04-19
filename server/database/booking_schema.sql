PRAGMA foreign_keys = ON;

DROP TABLE IF EXISTS appointment_history;
DROP TABLE IF EXISTS hm_submitted_time_slots;
DROP TABLE IF EXISTS hm_availability_submissions;
DROP TABLE IF EXISTS heatmaps;
DROP TABLE IF EXISTS appointment_participants;
DROP TABLE IF EXISTS invitations;
DROP TABLE IF EXISTS appointments;
DROP TABLE IF EXISTS availabilities;
DROP TABLE IF EXISTS course_ownerships;
DROP TABLE IF EXISTS course_admin_assignments;
DROP TABLE IF EXISTS course_enrollments;
DROP TABLE IF EXISTS courses;
DROP TABLE IF EXISTS users;

CREATE TABLE users (
    user_id              INTEGER PRIMARY KEY AUTOINCREMENT,
    first_name           TEXT NOT NULL,
    last_name            TEXT NOT NULL,
    mcgill_email         TEXT NOT NULL UNIQUE,
    user_type            TEXT NOT NULL CHECK (user_type IN ('student', 'course_admin', 'general_admin')),
    password_hash        TEXT NOT NULL,
    department           TEXT,
    staff_title          TEXT,
    created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    last_login_at        TEXT
);

CREATE TABLE courses (
    course_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    course_code          TEXT NOT NULL,
    course_name          TEXT NOT NULL,
    course_term          TEXT NOT NULL,
    course_year          INTEGER NOT NULL,
    description          TEXT,
    invitation_link      TEXT,
    UNIQUE(course_code, course_term, course_year)
);

CREATE TABLE course_enrollments (
    enrollment_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id              INTEGER NOT NULL,
    course_id            INTEGER NOT NULL,
    join_password        TEXT,
    enrolled_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    enrollment_status    TEXT NOT NULL DEFAULT 'active'
                         CHECK (enrollment_status IN ('active', 'completed', 'removed')),
    UNIQUE(user_id, course_id),
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE course_admin_assignments (
    assignment_id        INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id            INTEGER NOT NULL,
    course_admin_id      INTEGER NOT NULL,
    assigned_by_admin_id INTEGER,
    assigned_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'revoked')),
    UNIQUE(course_id, course_admin_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (course_admin_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_by_admin_id) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE course_ownerships (
    ownership_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id            INTEGER NOT NULL,
    general_admin_id     INTEGER NOT NULL,
    assigned_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status               TEXT NOT NULL DEFAULT 'active'
                         CHECK (status IN ('active', 'revoked')),
    UNIQUE(course_id, general_admin_id),
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE,
    FOREIGN KEY (general_admin_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE availabilities (
    availability_id      INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by           INTEGER NOT NULL,
    course_id            INTEGER,
    location             TEXT,
    capacity             INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    start_time           TEXT NOT NULL,
    end_time             TEXT NOT NULL,
    visibility           TEXT NOT NULL DEFAULT 'private'
                         CHECK (visibility IN ('public', 'private')),
    recurrence_rule      TEXT,
    av_title             TEXT,
    av_description       TEXT,
    created_at           TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (datetime(end_time) > datetime(start_time)),
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE CASCADE
);

CREATE TABLE appointments (
    appointment_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    course_id                 INTEGER,
    created_from_availability INTEGER,
    capacity                  INTEGER NOT NULL DEFAULT 1 CHECK (capacity >= 1),
    location                  TEXT,
    start_time                TEXT NOT NULL,
    end_time                  TEXT NOT NULL,
    visibility                TEXT NOT NULL DEFAULT 'private'
                              CHECK (visibility IN ('public', 'private')),
    ap_title                  TEXT,
    ap_description            TEXT,
    scheduling_mode           TEXT NOT NULL
                              CHECK (scheduling_mode IN ('calendar', 'heatmap', 'direct_request')),
    status                    TEXT NOT NULL DEFAULT 'pending'
                              CHECK (status IN ('pending', 'waiting_confirmation', 'confirmed', 'cancelled', 'rescheduled')),
    created_at                TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CHECK (datetime(end_time) > datetime(start_time)),
    FOREIGN KEY (course_id) REFERENCES courses(course_id) ON DELETE SET NULL,
    FOREIGN KEY (created_from_availability) REFERENCES availabilities(availability_id) ON DELETE SET NULL
);

CREATE TABLE invitations (
    invitation_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id        INTEGER NOT NULL,
    inviter_user_id       INTEGER NOT NULL,
    invitee_user_id       INTEGER NOT NULL,
    status                TEXT NOT NULL DEFAULT 'sent'
                         CHECK (status IN ('sent', 'accepted', 'declined', 'cancelled')),
    sent_at               TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (appointment_id, invitee_user_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (inviter_user_id) REFERENCES users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (invitee_user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE appointment_participants (
    appointment_id        INTEGER NOT NULL,
    user_id               INTEGER NOT NULL,
    participant_role      TEXT NOT NULL 
                         CHECK (participant_role IN ('host', 'attendee')),
    response_status       TEXT DEFAULT 'accepted' 
                         CHECK (response_status IN ('pending', 'accepted', 'declined')),
    joined_at             DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (appointment_id, user_id),
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE appointment_history (
    history_id            INTEGER PRIMARY KEY AUTOINCREMENT,
    appointment_id        INTEGER NOT NULL,
    changed_by            INTEGER,
    changed_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    old_status            TEXT,
    new_status            TEXT,
    old_start_time        TEXT,
    new_start_time        TEXT,
    old_end_time          TEXT,
    new_end_time          TEXT,
    note                  TEXT,
    FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
    FOREIGN KEY (changed_by) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE TABLE heatmaps (
    hm_id                 INTEGER PRIMARY KEY AUTOINCREMENT,
    created_by            INTEGER NOT NULL,
    hm_title              TEXT NOT NULL,
    hm_description        TEXT,
    hm_link               TEXT UNIQUE,
    visibility            TEXT NOT NULL DEFAULT 'private'
                         CHECK (visibility IN ('private', 'public')),
    no_earlier_time       TEXT,
    no_later_time         TEXT,
    time_zone             TEXT NOT NULL DEFAULT 'America/Montreal',
    created_at            TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE hm_availability_submissions (
    submission_id         INTEGER PRIMARY KEY AUTOINCREMENT,
    heatmap_id            INTEGER NOT NULL,
    user_id               INTEGER NOT NULL,
    participant_role      TEXT NOT NULL
                         CHECK (participant_role IN ('host', 'attendee', 'requester', 'invitee')),
    submitted_at          TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
    UNIQUE (heatmap_id, user_id),
    FOREIGN KEY (heatmap_id) REFERENCES heatmaps(hm_id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
);

CREATE TABLE hm_submitted_time_slots (
    slot_id               INTEGER PRIMARY KEY AUTOINCREMENT,
    submission_id         INTEGER NOT NULL,
    start_time            TEXT NOT NULL,
    end_time              TEXT NOT NULL,
    CHECK (datetime(end_time) > datetime(start_time)),
    FOREIGN KEY (submission_id) REFERENCES hm_availability_submissions(submission_id) ON DELETE CASCADE
);

CREATE INDEX idx_course_enrollments_user ON course_enrollments(user_id);
CREATE INDEX idx_course_enrollments_course ON course_enrollments(course_id);
CREATE INDEX idx_availabilities_creator ON availabilities(created_by);
CREATE INDEX idx_availabilities_course ON availabilities(course_id);
CREATE INDEX idx_availabilities_time ON availabilities(start_time, end_time);
CREATE INDEX idx_appointments_course ON appointments(course_id);
CREATE INDEX idx_appointments_time ON appointments(start_time, end_time);
CREATE INDEX idx_appointment_participants_user ON appointment_participants(user_id);
CREATE INDEX idx_invitations_invitee ON invitations(invitee_user_id);
CREATE INDEX idx_heatmap_submissions_heatmap ON hm_availability_submissions(heatmap_id);
CREATE INDEX idx_heatmap_slots_submission ON hm_submitted_time_slots(submission_id);
