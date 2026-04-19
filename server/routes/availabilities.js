const express = require('express');
const router = express.Router();
const db = require('../config/db');

function toSqliteDateTime(date) {
  return date.toISOString().slice(0, 19);
}

function parseDate(value) {
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function normalizeCourseId(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return 'invalid';
  return n;
}

/** Course owner or active course admin (any user_type) may add course-tied office hours. */
function assertUserMayPostOfficeHours(courseId, userId, callback) {
  db.get('SELECT course_id FROM courses WHERE course_id = ?', [courseId], (err, course) => {
    if (err) return callback(err);
    if (!course) {
      const e = new Error('Course not found');
      e.statusCode = 404;
      return callback(e);
    }
    db.get(
      `SELECT 1 AS ok FROM course_ownerships
       WHERE course_id = ? AND general_admin_id = ? AND status = 'active'
       UNION ALL
       SELECT 1 AS ok FROM course_admin_assignments
       WHERE course_id = ? AND course_admin_id = ? AND status = 'active'
       LIMIT 1`,
      [courseId, userId, courseId, userId],
      (e2, row) => {
        if (e2) return callback(e2);
        if (!row) {
          const e = new Error('You are not an owner or course admin for this course.');
          e.statusCode = 403;
          return callback(e);
        }
        callback(null);
      }
    );
  });
}

function buildSlots(startDate, endDate, slotDurationMinutes) {
  const slots = [];
  let current = new Date(startDate);

  while (current < endDate) {
    const slotStart = new Date(current);
    const slotEnd = new Date(current.getTime() + slotDurationMinutes * 60 * 1000);

    slots.push({
      start_time: toSqliteDateTime(slotStart),
      end_time: toSqliteDateTime(slotEnd)
    });

    current = slotEnd;
  }

  return slots;
}

router.post('/', (req, res) => {
  const {
    created_by,
    start_time,
    end_time,
    slot_duration_minutes,
    location,
    capacity,
    visibility,
    recurrence_rule,
    av_title,
    av_description,
    course_id: bodyCourseId,
  } = req.body;

  const courseIdNorm = normalizeCourseId(bodyCourseId);
  if (courseIdNorm === 'invalid') {
    return res.status(400).json({ error: 'course_id must be a positive integer or null/omitted.' });
  }

  if (!created_by || !start_time || !end_time) {
    return res.status(400).json({
      error: 'created_by, start_time, and end_time are required'
    });
  }

  const finalCapacity = capacity ?? 1;
  const finalVisibility = visibility ?? 'private';
  const finalSlotDuration = slot_duration_minutes ?? 30;

  if (!Number.isInteger(finalCapacity) || finalCapacity < 1) {
    return res.status(400).json({
      error: 'capacity must be >= 1'
    });
  }

  if (!['public', 'private'].includes(finalVisibility)) {
    return res.status(400).json({
      error: 'visibility must be public or private'
    });
  }

  if (!Number.isInteger(finalSlotDuration) || finalSlotDuration < 1) {
    return res.status(400).json({
      error: 'slot_duration_minutes must be a positive integer'
    });
  }

  const startDate = parseDate(start_time);
  const endDate = parseDate(end_time);

  if (!startDate || !endDate) {
    return res.status(400).json({
      error: 'start_time and end_time must be valid datetimes'
    });
  }

  if (endDate <= startDate) {
    return res.status(400).json({
      error: 'end_time must be after start_time'
    });
  }

  const totalMinutes = (endDate.getTime() - startDate.getTime()) / (1000 * 60);

  if (totalMinutes % finalSlotDuration !== 0) {
    return res.status(400).json({
      error: 'Time range must divide evenly by slot_duration_minutes'
    });
  }

  const slots = buildSlots(startDate, endDate, finalSlotDuration);

  if (slots.length === 0) {
    return res.status(400).json({
      error: 'No slots could be created from the provided time range'
    });
  }

  db.get(
    `SELECT user_id, user_type FROM users WHERE user_id = ?`,
    [created_by],
    (err, user) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!user) {
        return res.status(404).json({ error: 'User not found' });
      }

      const courseIdForRow = courseIdNorm;

      if (courseIdForRow == null) {
        const allowed = ['course_admin', 'general_admin'];
        if (!allowed.includes(user.user_type)) {
          return res.status(403).json({
            error: 'Not allowed to create availability'
          });
        }
      }

      const overlapCourseKey = courseIdForRow == null ? -1 : courseIdForRow;

      const startCreateFlow = () => {
      const overlapQuery = `
        SELECT availability_id, start_time, end_time
        FROM availabilities
        WHERE created_by = ?
          AND COALESCE(course_id, -1) = ?
          AND datetime(start_time) < datetime(?)
          AND datetime(end_time) > datetime(?)
        LIMIT 1
      `;

      const checkOverlaps = (index) => {
        if (index >= slots.length) {
          return insertSlots();
        }

        const slot = slots[index];

        db.get(
          overlapQuery,
          [created_by, overlapCourseKey, slot.end_time, slot.start_time],
          (err, overlap) => {
            if (err) return res.status(500).json({ error: err.message });

            if (overlap) {
              return res.status(400).json({
                error: 'One or more generated slots overlap with an existing availability',
                conflicting_slot: slot,
                existing_availability: overlap
              });
            }

            checkOverlaps(index + 1);
          }
        );
      };

      const insertedIds = [];

      const insertSlots = () => {
        const insertQuery = `
          INSERT INTO availabilities
          (
            created_by,
            course_id,
            location,
            capacity,
            start_time,
            end_time,
            visibility,
            recurrence_rule,
            av_title,
            av_description
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        const insertOne = (index) => {
          if (index >= slots.length) {
            const placeholders = insertedIds.map(() => '?').join(',');

            db.all(
              `SELECT * FROM availabilities WHERE availability_id IN (${placeholders}) ORDER BY datetime(start_time) ASC`,
              insertedIds,
              (err, rows) => {
                if (err) return res.status(500).json({ error: err.message });

                return res.status(201).json({
                  message: 'Availabilities created successfully',
                  created_count: rows.length,
                  slot_duration_minutes: finalSlotDuration,
                  availabilities: rows
                });
              }
            );

            return;
          }

          const slot = slots[index];

          db.run(
            insertQuery,
            [
              created_by,
              courseIdForRow,
              location || null,
              finalCapacity,
              slot.start_time,
              slot.end_time,
              finalVisibility,
              recurrence_rule || null,
              av_title || null,
              av_description || null
            ],
            function (err) {
              if (err) {
                return res.status(500).json({ error: err.message });
              }

              insertedIds.push(this.lastID);
              insertOne(index + 1);
            }
          );
        };

        insertOne(0);
      };

      checkOverlaps(0);
      };

      if (courseIdForRow == null) {
        return startCreateFlow();
      }

      return assertUserMayPostOfficeHours(courseIdForRow, user.user_id, (courseErr) => {
        if (courseErr) {
          const code = courseErr.statusCode || 500;
          return res.status(code).json({ error: courseErr.message });
        }
        startCreateFlow();
      });
    }
  );
});

router.get('/', (req, res) => {
  const {
    created_by,
    visibility,
    date,
    include_full,
    include_past,
    include_creator,
    search
  } = req.query;

  const conditions = [];
  const params = [];

  const joinCreator = include_creator === 'true' || !!search;

  if (created_by) {
    conditions.push(`a.created_by = ?`);
    params.push(created_by);
  }

  if (visibility) {
    if (!['public', 'private'].includes(visibility)) {
      return res.status(400).json({
        error: 'visibility must be public or private'
      });
    }

    conditions.push(`a.visibility = ?`);
    params.push(visibility);
  } else if (!created_by) {
    conditions.push(`a.visibility = 'public'`);
  }

  if (date) {
    conditions.push(`date(a.start_time) = date(?)`);
    params.push(date);
  }

  if (include_past !== 'true') {
    conditions.push(`datetime(a.end_time) > datetime('now')`);
  }

  if (include_full !== 'true') {
    conditions.push(`
      (
        SELECT COUNT(*)
        FROM appointments ap
        WHERE ap.created_from_availability = a.availability_id
          AND ap.status != 'cancelled'
      ) < a.capacity
    `);
  }

  if (search) {
    conditions.push(`
      (
        lower(u.first_name) LIKE lower(?)
        OR lower(u.last_name) LIKE lower(?)
        OR lower(u.first_name || ' ' || u.last_name) LIKE lower(?)
        OR lower(u.mcgill_email) LIKE lower(?)
        OR lower(COALESCE(u.department, '')) LIKE lower(?)
        OR lower(COALESCE(u.staff_title, '')) LIKE lower(?)
      )
    `);

    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const whereClause =
    conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  const selectClause = joinCreator
    ? `
      SELECT
        a.*,
        u.user_id AS creator_user_id,
        u.first_name AS creator_first_name,
        u.last_name AS creator_last_name,
        u.mcgill_email AS creator_mcgill_email,
        u.user_type AS creator_user_type,
        u.department AS creator_department,
        u.staff_title AS creator_staff_title
    `
    : `
      SELECT a.*
    `;

  const joinClause = joinCreator
    ? `JOIN users u ON a.created_by = u.user_id`
    : '';

  const query = `
    ${selectClause}
    FROM availabilities a
    ${joinClause}
    ${whereClause}
    ORDER BY datetime(a.start_time) ASC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

router.get('/owners', (req, res) => {
  const { search } = req.query;

  const params = [];
  const conditions = [
    `a.visibility = 'public'`,
    `datetime(a.end_time) > datetime('now')`,
    `
    (
      SELECT COUNT(*)
      FROM appointments ap
      WHERE ap.created_from_availability = a.availability_id
        AND ap.status != 'cancelled'
    ) < a.capacity
    `
  ];

  if (search) {
    conditions.push(`
      (
        lower(u.first_name) LIKE lower(?)
        OR lower(u.last_name) LIKE lower(?)
        OR lower(u.first_name || ' ' || u.last_name) LIKE lower(?)
        OR lower(u.mcgill_email) LIKE lower(?)
        OR lower(COALESCE(u.department, '')) LIKE lower(?)
        OR lower(COALESCE(u.staff_title, '')) LIKE lower(?)
      )
    `);

    const searchTerm = `%${search}%`;
    params.push(searchTerm, searchTerm, searchTerm, searchTerm, searchTerm, searchTerm);
  }

  const query = `
    SELECT DISTINCT
      u.user_id,
      u.first_name,
      u.last_name,
      u.mcgill_email,
      u.user_type,
      u.department,
      u.staff_title
    FROM availabilities a
    JOIN users u
      ON a.created_by = u.user_id
    WHERE ${conditions.join(' AND ')}
    ORDER BY lower(u.last_name) ASC, lower(u.first_name) ASC
  `;

  db.all(query, params, (err, rows) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }

    res.json(rows);
  });
});

router.get('/owner/:createdBy', (req, res) => {
  const { createdBy } = req.params;

  const query = `
    SELECT a.*,
           (
             SELECT COUNT(*)
             FROM appointments ap
             WHERE ap.created_from_availability = a.availability_id
               AND ap.status != 'cancelled'
           ) AS booked_count
    FROM availabilities a
    WHERE a.created_by = ?
    ORDER BY a.start_time ASC
  `;

  db.all(query, [createdBy], (err, rows) => {
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

  db.get(
    `SELECT * FROM availabilities WHERE availability_id = ?`,
    [availabilityId],
    (err, availability) => {
      if (err) return res.status(500).json({ error: err.message });

      if (!availability) {
        return res.status(404).json({ error: 'Availability not found' });
      }

      db.get(
        `SELECT user_id, user_type FROM users WHERE user_id = ?`,
        [deleted_by],
        (err, user) => {
          if (err) return res.status(500).json({ error: err.message });

          if (!user) {
            return res.status(404).json({ error: 'Deleting user not found' });
          }

          const isCreator = Number(availability.created_by) === Number(deleted_by);
          const isFacultyAdmin = ['course_admin', 'general_admin'].includes(user.user_type);

          const runDeleteAfterChecks = () => {
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

                db.run(
                  `DELETE FROM availabilities WHERE availability_id = ?`,
                  [availabilityId],
                  function (delErr) {
                    if (delErr) return res.status(500).json({ error: delErr.message });

                    res.json({
                      message: 'Availability deleted successfully',
                      deleted_availability_id: Number(availabilityId)
                    });
                  }
                );
              }
            );
          };

          if (isCreator) {
            return runDeleteAfterChecks();
          }

          if (availability.course_id) {
            return db.get(
              `SELECT 1 AS ok FROM course_ownerships
               WHERE course_id = ? AND general_admin_id = ? AND status = 'active'
               UNION ALL
               SELECT 1 AS ok FROM course_admin_assignments
               WHERE course_id = ? AND course_admin_id = ? AND status = 'active'
               LIMIT 1`,
              [availability.course_id, deleted_by, availability.course_id, deleted_by],
              (e2, staffRow) => {
                if (e2) return res.status(500).json({ error: e2.message });
                if (staffRow) return runDeleteAfterChecks();
                return res.status(403).json({
                  error: 'Not allowed to delete this availability'
                });
              }
            );
          }

          if (!isFacultyAdmin) {
            return res.status(403).json({
              error: 'Not allowed to delete this availability'
            });
          }

          runDeleteAfterChecks();
        }
      );
    }
  );
});

module.exports = router;