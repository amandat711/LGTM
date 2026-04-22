const express = require('express');
const router = express.Router();
const db = require('../config/db');
const { parseDate, toStoredIsoDateTime } = require('../utils/dateTime');

const NEVER_MAX_WEEKS = 12; // Limit "never" recurrence to 12 weeks for safety

function toSqliteDateTime(date) {
  return toStoredIsoDateTime(date);
}

function normalizeCourseId(value) {
  if (value === undefined || value === null || value === '') return null;
  const n = parseInt(value, 10);
  if (Number.isNaN(n) || n < 1) return 'invalid';
  return n;
}

/**
 * Convert a Date to a weekday code (MO, TU, WE, etc.)
 */
function weekdayCodeFromDate(date) {
  const dayOfWeek = date.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const codeMap = ['SU', 'MO', 'TU', 'WE', 'TH', 'FR', 'SA'];
  return codeMap[dayOfWeek];
}

/**
 * Generate weekly recurring occurrences based on a recurrence rule
 * Returns an array of { start: Date, end: Date } objects
 */
function generateWeeklyOccurrences({
  baseStartDate,
  baseEndDate,
  interval,
  byWeekdays,
  endType,
  until,
  count,
  maxOccurrences = 200,
}) {
  const occurrences = [];
  const baseDuration = baseEndDate.getTime() - baseStartDate.getTime();
  let occurrenceCount = 0;

  // Get the start of the week for baseStartDate (Sunday)
  let weekStart = new Date(baseStartDate);
  const dayOfWeek = weekStart.getDay();
  weekStart.setDate(weekStart.getDate() - dayOfWeek); // Go back to Sunday
  weekStart.setHours(0, 0, 0, 0);

  // Process weeks according to interval
  while (occurrences.length < maxOccurrences) {
    // Check each day in the current week
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const dayDate = new Date(weekStart);
      dayDate.setDate(dayDate.getDate() + dayOffset);
      dayDate.setHours(baseStartDate.getHours(), baseStartDate.getMinutes(), baseStartDate.getSeconds());

      // Skip if this day is before baseStartDate
      if (dayDate < baseStartDate) {
        continue;
      }

      const dayWeekday = weekdayCodeFromDate(dayDate);

      // If this day matches a selected weekday, create an occurrence
      if (byWeekdays.includes(dayWeekday)) {
        const occStart = new Date(dayDate);
        const occEnd = new Date(occStart.getTime() + baseDuration);

        occurrences.push({
          start: occStart,
          end: occEnd,
        });

        occurrenceCount += 1;

        // Check end conditions
        if (endType === 'after' && occurrenceCount >= count) {
          return occurrences;
        }

        if (endType === 'on') {
          const untilDate = parseDate(until);
          if (occEnd > untilDate) {
            // Remove last occurrence if it goes past the until date
            occurrences.pop();
            return occurrences;
          }
        }
      }
    }

    // Move to next interval weeks
    weekStart.setDate(weekStart.getDate() + 7 * interval);

    // Check if we've gone too far (for 'never' type, use maxOccurrences)
    if (endType === 'never') {
      const weeksElapsed = (weekStart.getTime() - baseStartDate.getTime()) / (1000 * 60 * 60 * 24 * 7);
      if (weeksElapsed > NEVER_MAX_WEEKS) {
        break;
      }
    }
  }

  return occurrences;
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
  } = req.body;

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

  // Parse and validate recurrence_rule
  let parsedRecurrence = null;
  let recurrenceRuleForDb = null;

  if (recurrence_rule) {
    console.log('[DEBUG] recurrence_rule received:', recurrence_rule);
    console.log('[DEBUG] recurrence_rule type:', typeof recurrence_rule);
    
    // Handle both object and JSON string formats
    if (typeof recurrence_rule === 'string') {
      try {
        parsedRecurrence = JSON.parse(recurrence_rule);
        console.log('[DEBUG] Parsed from string:', parsedRecurrence);
      } catch (e) {
        return res.status(400).json({
          error: 'recurrence_rule must be valid JSON if provided as string'
        });
      }
    } else if (typeof recurrence_rule === 'object') {
      parsedRecurrence = recurrence_rule;
      console.log('[DEBUG] Using object directly:', parsedRecurrence);
    } else {
      return res.status(400).json({
        error: 'recurrence_rule must be an object or JSON string'
      });
    }

    console.log('[DEBUG] parsedRecurrence after parsing:', parsedRecurrence);
    console.log('[DEBUG] parsedRecurrence.enabled:', parsedRecurrence?.enabled);
    
    // Validate recurrence structure
    if (parsedRecurrence.enabled) {
      console.log('[DEBUG] Recurrence is enabled, validating...');
      
      if (parsedRecurrence.frequency !== 'weekly') {
        return res.status(400).json({
          error: 'Only weekly recurrence is supported in phase 1'
        });
      }

      if (!Number.isInteger(parsedRecurrence.interval) || parsedRecurrence.interval < 1) {
        return res.status(400).json({
          error: 'recurrence_rule.interval must be a positive integer'
        });
      }

      if (!Array.isArray(parsedRecurrence.byWeekdays) || parsedRecurrence.byWeekdays.length === 0) {
        return res.status(400).json({
          error: 'recurrence_rule.byWeekdays must be a non-empty array of weekday codes (MO, TU, WE, etc.)'
        });
      }

      const validWeekdays = ['MO', 'TU', 'WE', 'TH', 'FR', 'SA', 'SU'];
      if (!parsedRecurrence.byWeekdays.every((code) => validWeekdays.includes(code))) {
        return res.status(400).json({
          error: 'recurrence_rule.byWeekdays contains invalid weekday codes'
        });
      }

      if (!['never', 'on', 'after'].includes(parsedRecurrence.endType)) {
        return res.status(400).json({
          error: 'recurrence_rule.endType must be "never", "on", or "after"'
        });
      }

      if (parsedRecurrence.endType === 'on') {
        if (!parsedRecurrence.until) {
          return res.status(400).json({
            error: 'recurrence_rule.until is required when endType is "on"'
          });
        }
        const untilDate = parseDate(parsedRecurrence.until);
        if (!untilDate) {
          return res.status(400).json({
            error: 'recurrence_rule.until must be a valid date'
          });
        }
      }

      if (parsedRecurrence.endType === 'after') {
        if (!Number.isInteger(parsedRecurrence.count) || parsedRecurrence.count < 1) {
          return res.status(400).json({
            error: 'recurrence_rule.count must be a positive integer when endType is "after"'
          });
        }
      }

      recurrenceRuleForDb = JSON.stringify(parsedRecurrence);
      console.log('[DEBUG] recurrenceRuleForDb set to:', recurrenceRuleForDb);
    } else {
      console.log('[DEBUG] Recurrence is disabled');
    }
  } else {
    console.log('[DEBUG] No recurrence_rule provided');
  }

  // Generate slots
  let slots = [];
  
  if (!parsedRecurrence || !parsedRecurrence.enabled) {
    // Non-recurring: use single time window
    console.log('[DEBUG] Using non-recurring flow');
    slots = buildSlots(startDate, endDate, finalSlotDuration);
  } else {
    // Recurring: generate occurrences and slots for each
    console.log('[DEBUG] Using recurring flow with interval:', parsedRecurrence.interval, 'byWeekdays:', parsedRecurrence.byWeekdays);
    
    const occurrences = generateWeeklyOccurrences({
      baseStartDate: startDate,
      baseEndDate: endDate,
      interval: parsedRecurrence.interval,
      byWeekdays: parsedRecurrence.byWeekdays,
      endType: parsedRecurrence.endType,
      until: parsedRecurrence.until,
      count: parsedRecurrence.count,
    });

    console.log('[DEBUG] Generated', occurrences.length, 'occurrences');
    console.log('[DEBUG] Occurrences:', occurrences.map(o => ({ start: o.start.toISOString(), end: o.end.toISOString() })));

    for (const occ of occurrences) {
      const occSlots = buildSlots(occ.start, occ.end, finalSlotDuration);
      console.log('[DEBUG] Built', occSlots.length, 'slots for occurrence starting', occ.start.toISOString());
      slots.push(...occSlots);
    }
  }

  console.log('[DEBUG] Total slots generated:', slots.length);
  if (slots.length > 0) {
    console.log('[DEBUG] First slot:', slots[0]);
    console.log('[DEBUG] Last slot:', slots[slots.length - 1]);
  }

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

      const allowed = ['course_admin', 'general_admin'];
      if (!allowed.includes(user.user_type)) {
        return res.status(403).json({
          error: 'Not allowed to create availability'
        });
      }

      const overlapQuery = `
        SELECT availability_id, start_time, end_time
        FROM availabilities
        WHERE created_by = ?
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
          [created_by, slot.end_time, slot.start_time],
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
            location,
            capacity,
            start_time,
            end_time,
            visibility,
            recurrence_rule,
            av_title,
            av_description
          )
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
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
                  recurrence_applied: !!parsedRecurrence?.enabled,
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
              location || null,
              finalCapacity,
              slot.start_time,
              slot.end_time,
              finalVisibility,
              recurrenceRuleForDb || null,
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

router.patch('/:id', (req, res) => {
  const availabilityId = req.params.id;
  const {
    updated_by,
    location,
    capacity,
    visibility,
    start_time,
    end_time,
    av_title,
    av_description,
    recurrence_rule
  } = req.body;

  if (!updated_by) {
    return res.status(400).json({
      error: 'updated_by is required'
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
        [updated_by],
        (err, user) => {
          if (err) return res.status(500).json({ error: err.message });

          if (!user) {
            return res.status(404).json({ error: 'Updating user not found' });
          }

          const isOwner = Number(availability.created_by) === Number(updated_by);
          const isAdmin = ['course_admin', 'general_admin'].includes(user.user_type);

          if (!isOwner && !isAdmin) {
            return res.status(403).json({
              error: 'Not allowed to update this availability'
            });
          }

          const fieldsToCheck = { location, capacity, visibility, start_time, end_time, recurrence_rule };
          const hasScheduleChanges = Object.keys(fieldsToCheck).some(
            (key) => fieldsToCheck[key] !== undefined
          );

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

              if (countRow.active_booking_count > 0 && hasScheduleChanges) {
                return res.status(400).json({
                  error: 'Cannot update schedule details for availability with active booking(s)'
                });
              }

              const updateFields = [];
              const params = [];

              if (location !== undefined) {
                updateFields.push('location = ?');
                params.push(location || null);
              }

              if (capacity !== undefined) {
                const finalCapacity = Number(capacity);
                if (!Number.isInteger(finalCapacity) || finalCapacity < 1) {
                  return res.status(400).json({
                    error: 'capacity must be >= 1'
                  });
                }
                updateFields.push('capacity = ?');
                params.push(finalCapacity);
              }

              if (visibility !== undefined) {
                if (!['public', 'private'].includes(visibility)) {
                  return res.status(400).json({
                    error: 'visibility must be public or private'
                  });
                }
                updateFields.push('visibility = ?');
                params.push(visibility);
              }

              let updatedStartTime = availability.start_time;
              let updatedEndTime = availability.end_time;

              if (start_time !== undefined) {
                const parsedStart = parseDate(start_time);
                if (!parsedStart) {
                  return res.status(400).json({
                    error: 'start_time must be a valid datetime'
                  });
                }
                updatedStartTime = toSqliteDateTime(parsedStart);
                updateFields.push('start_time = ?');
                params.push(updatedStartTime);
              }

              if (end_time !== undefined) {
                const parsedEnd = parseDate(end_time);
                if (!parsedEnd) {
                  return res.status(400).json({
                    error: 'end_time must be a valid datetime'
                  });
                }
                updatedEndTime = toSqliteDateTime(parsedEnd);
                updateFields.push('end_time = ?');
                params.push(updatedEndTime);
              }

              if (end_time !== undefined || start_time !== undefined) {
                if (new Date(updatedEndTime) <= new Date(updatedStartTime)) {
                  return res.status(400).json({
                    error: 'end_time must be after start_time'
                  });
                }
              }

              if (av_title !== undefined) {
                updateFields.push('av_title = ?');
                params.push(av_title || null);
              }

              if (av_description !== undefined) {
                updateFields.push('av_description = ?');
                params.push(av_description || null);
              }

              if (recurrence_rule !== undefined) {
                updateFields.push('recurrence_rule = ?');
                params.push(recurrence_rule || null);
              }

              if (updateFields.length === 0) {
                return res.status(400).json({
                  error: 'No valid fields provided for update'
                });
              }

              params.push(availabilityId);

              db.run(
                `UPDATE availabilities SET ${updateFields.join(', ')} WHERE availability_id = ?`,
                params,
                function (err) {
                  if (err) return res.status(500).json({ error: err.message });

                  db.get(
                    `SELECT * FROM availabilities WHERE availability_id = ?`,
                    [availabilityId],
                    (err, updatedAvailability) => {
                      if (err) return res.status(500).json({ error: err.message });

                      res.json({
                        message: 'Availability updated successfully',
                        availability: updatedAvailability
                      });
                    }
                  );
                }
              );
            }
          );
        }
      );
    }
  );
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