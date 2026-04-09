const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.post('/', (req, res) => {
  const {
    created_by,
    start_time,
    end_time,
    location,
    capacity,
    visibility,
    recurrence_rule,
    av_title,
    av_description
  } = req.body;

  // Required fields
  if (!created_by || !start_time || !end_time) {
    return res.status(400).json({
      error: 'created_by, start_time, and end_time are required'
    });
  }

  // Defaults
  const finalCapacity = capacity ?? 1;
  const finalVisibility = visibility ?? 'private';

  // Validate capacity (extra safety)
  if (!Number.isInteger(finalCapacity) || finalCapacity < 1) {
    return res.status(400).json({
      error: 'capacity must be >= 1'
    });
  }

  // Validate visibility
  if (!['public', 'private'].includes(finalVisibility)) {
    return res.status(400).json({
      error: 'visibility must be public or private'
    });
  }

  // Check user exists
  db.get(
    `SELECT user_id, user_type FROM users WHERE user_id = ?`,
    [created_by],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      // Restrict who can create slots
      const allowed = ['course_admin', 'general_admin'];
      if (!allowed.includes(user.user_type)) {
        return res.status(403).json({
          error: 'Not allowed to create availability'
        });
      }

      // Insert
      const query = `
        INSERT INTO availabilities
        (created_by, location, capacity, start_time, end_time, visibility, recurrence_rule, av_title, av_description)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `;

      db.run(
        query,
        [
          created_by,
          location || null,
          finalCapacity,
          start_time,
          end_time,
          finalVisibility,
          recurrence_rule || null,
          av_title || null,
          av_description || null
        ],
        function (err) {
          if (err) {
            return res.status(500).json({ error: err.message });
          }

          db.get(
            `SELECT * FROM availabilities WHERE availability_id = ?`,
            [this.lastID],
            (err, row) => {
              if (err) return res.status(500).json({ error: err.message });

              res.status(201).json({
                message: 'Availability created',
                availability: row
              });
            }
          );
        }
      );
    }
  );
});

router.get('/', (req, res) => {
  const query = `
    SELECT *
    FROM availabilities
    WHERE visibility = 'public'
      AND datetime(end_time) > datetime('now')
    ORDER BY start_time ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

module.exports = router;


/*TODO: filters 
such as the following:

GET /availabilities?created_by=1
GET /availabilities?date=2026-04-10
*/