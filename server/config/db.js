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
  });
}

const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Database connection error:', err.message);
  } else {
    console.log('Connected to SQLite database');

    // Enable foreign keys
    db.run('PRAGMA foreign_keys = ON');
    ensureAppointmentRecurrenceColumns(db);
  }
});

module.exports = db;