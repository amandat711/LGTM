// AMANDA TRAN
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, '../database/app.db');

function ensureAppointmentRecurrenceColumns(database) {
  database.all('PRAGMA table_info(appointments)', (pragmaErr, cols) => {
    if (pragmaErr) {
      console.error('PRAGMA table_info(appointments) failed:', pragmaErr.message);
      return;
    }
    const names = new Set((cols || []).map((c) => c.name));
    if (!names.has('recurrence_rule')) {
      database.run('ALTER TABLE appointments ADD COLUMN recurrence_rule TEXT', (e) => {
        if (e && !String(e.message).includes('duplicate column')) {
          console.error('ALTER appointments recurrence_rule:', e.message);
        }
      });
    }
    if (!names.has('recurrence_group_id')) {
      database.run('ALTER TABLE appointments ADD COLUMN recurrence_group_id INTEGER', (e) => {
        if (e && !String(e.message).includes('duplicate column')) {
          console.error('ALTER appointments recurrence_group_id:', e.message);
        }
      });
    }
    if (!names.has('ap_color')) {
      database.run("ALTER TABLE appointments ADD COLUMN ap_color TEXT NOT NULL DEFAULT '#1565A8'", (e) => {
        if (e && !String(e.message).includes('duplicate column')) {
          console.error('ALTER appointments ap_color:', e.message);
        }
      });
    }
    if (!names.has('ics_sequence')) {
      database.run('ALTER TABLE appointments ADD COLUMN ics_sequence INTEGER NOT NULL DEFAULT 0', (e) => {
        if (e && !String(e.message).includes('duplicate column')) {
          console.error('ALTER appointments ics_sequence:', e.message);
        }
      });
    }
  });
}

function ensureAppointmentCancellationDismissalsTable(database) {
  database.run(
    `
    CREATE TABLE IF NOT EXISTS appointment_cancellation_dismissals (
      appointment_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      dismissed_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (appointment_id, user_id),
      FOREIGN KEY (appointment_id) REFERENCES appointments(appointment_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
    `,
    (e) => {
      if (e) {
        console.error('CREATE appointment_cancellation_dismissals:', e.message);
      }
    }
  );
}

function ensureCalendarSyncFeedsTable(database) {
  database.run(
    `
    CREATE TABLE IF NOT EXISTS calendar_sync_feeds (
      user_id INTEGER PRIMARY KEY,
      token_value TEXT NOT NULL UNIQUE,
      token_hash TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      rotated_at TEXT,
      last_accessed_at TEXT,
      is_active INTEGER NOT NULL DEFAULT 1 CHECK (is_active IN (0, 1)),
      FOREIGN KEY (user_id) REFERENCES users(user_id) ON DELETE CASCADE
    )
    `,
    (e) => {
      if (e) {
        console.error('CREATE calendar_sync_feeds:', e.message);
      }
    }
  );
  database.all('PRAGMA table_info(calendar_sync_feeds)', (pragmaErr, cols) => {
    if (pragmaErr) {
      console.error('PRAGMA table_info(calendar_sync_feeds) failed:', pragmaErr.message);
      return;
    }
    const names = new Set((cols || []).map((c) => c.name));
    if (!names.has('token_value')) {
      database.run('ALTER TABLE calendar_sync_feeds ADD COLUMN token_value TEXT', (e) => {
        if (e && !String(e.message).includes('duplicate column')) {
          console.error('ALTER calendar_sync_feeds token_value:', e.message);
        }
      });
    }
  });
  database.run(
    'CREATE INDEX IF NOT EXISTS idx_calendar_sync_feeds_token_hash ON calendar_sync_feeds(token_hash)',
    (e) => {
      if (e) {
        console.error('CREATE idx_calendar_sync_feeds_token_hash:', e.message);
      }
    }
  );
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    ensureAppointmentRecurrenceColumns(db);
    ensureAppointmentCancellationDismissalsTable(db);
    ensureCalendarSyncFeedsTable(db);
  }
});

module.exports = db;
