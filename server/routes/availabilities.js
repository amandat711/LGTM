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
    SELECT a.*
    FROM availabilities a
    WHERE a.visibility = 'public'
      AND datetime(a.end_time) > datetime('now')
      AND (
        SELECT COUNT(*)
        FROM appointments ap
        WHERE ap.created_from_availability = a.availability_id
          AND ap.status != 'cancelled'
      ) < a.capacity
    ORDER BY a.start_time ASC
  `;

  db.all(query, [], (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

router.delete('/:id', (req, res) => {
  const availabilityId = req.params.id;
  const { deleted_by } = req.body;

  if (!deleted_by) {
    return res.status(400).json({
      error: 'deleted_by is required'
    });
  }

  // Check availability exists
  db.get(
    `SELECT * FROM availabilities WHERE availability_id = ?`,
    [availabilityId],
    (err, availability) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!availability) {
        return res.status(404).json({ error: 'Availability not found' });
      }

      // Check deleting user exists
      db.get(
        `SELECT user_id, user_type FROM users WHERE user_id = ?`,
        [deleted_by],
        (err, user) => {
          if (err) return res.status(500).json({ error: err.message });

          if (!user) {
            return res.status(404).json({ error: 'Deleting user not found' });
          }

          // Check permission
          // Allow:
          // - the creator of the availability
          // - course_admin / general_admin
          const isOwner = Number(availability.created_by) === Number(deleted_by);
          const isAdmin = ['course_admin', 'general_admin'].includes(user.user_type);

          if (!isOwner && !isAdmin) {
            return res.status(403).json({
              error: 'Not allowed to delete this availability'
            });
          }

          // Prevent deletion if active appointments exist
          db.get(
            `
            SELECT COUNT(*) AS active_booking_count
            FROM appointments
            WHERE created_from_availability = ?
              AND status != 'cancelled'
            `,
            [availabilityId],
            (err, countRow) => {
              if (err) return res.status(500).json({ error: err.message });

              if (countRow.active_booking_count > 0) {
                return res.status(400).json({
                  error: 'Cannot delete availability with active booking(s)'
                });
              }

              // Safe to delete
              db.run(
                `DELETE FROM availabilities WHERE availability_id = ?`,
                [availabilityId],
                function (err) {
                  if (err) return res.status(500).json({ error: err.message });

                  res.json({
                    message: 'Availability deleted successfully',
                    deleted_availability_id: Number(availabilityId)
                  });
                }
              );
            }
          );
        }
      );
    }
  );
});

module.exports = router;


/*TODO: filters 
such as the following:

GET /availabilities?created_by=1
GET /availabilities?date=2026-04-10
*/