const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { requireAuth } = require('./auth');

const router = express.Router();

function loadUser(req, res, next) {
  db.get(
    `SELECT user_id, user_type, first_name, last_name, mcgill_email
     FROM users WHERE user_id = ?`,
    [req.session.userId],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(401).json({ error: 'Not authenticated.' });
      req.user = row;
      next();
    }
  );
}

function generateInviteToken() {
  return crypto.randomBytes(24).toString('hex');
}

function inviteUrlForToken(token) {
  const origin = process.env.FRONTEND_ORIGIN || '';
  if (!origin) return null;
  return `${origin.replace(/\/$/, '')}/join?token=${encodeURIComponent(token)}`;
}

function parseCourseIdParam(req, res) {
  const courseId = parseInt(req.params.courseId, 10);
  if (Number.isNaN(courseId) || courseId < 1) {
    res.status(400).json({ error: 'Invalid course id.' });
    return null;
  }
  return courseId;
}

/** Mutations: active course owner (general_admin in course_ownerships) only. */
function requireCourseOwner(req, res, courseId, next) {
  if (req.user.user_type !== 'general_admin') {
    return res.status(403).json({ error: 'Only a course owner (general admin) can do this.' });
  }
  db.get(
    `SELECT ownership_id FROM course_ownerships
     WHERE course_id = ? AND general_admin_id = ? AND status = 'active'`,
    [courseId, req.user.user_id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) {
        return res.status(403).json({ error: 'You are not an active owner of this course.' });
      }
      next();
    }
  );
}

/**
 * POST /courses/:courseId/admins
 * Body: { user_id } — target must exist.
 */
router.post('/:courseId/admins', requireAuth, loadUser, (req, res) => {
  const courseId = parseCourseIdParam(req, res);
  if (courseId == null) return;

  requireCourseOwner(req, res, courseId, () => {
    const raw = (req.body || {}).user_id ?? (req.body || {}).course_admin_id;
    const targetId = parseInt(raw, 10);
    if (Number.isNaN(targetId) || targetId < 1) {
      return res.status(400).json({ error: 'user_id is required and must be a positive integer.' });
    }

    db.get(`SELECT course_id FROM courses WHERE course_id = ?`, [courseId], (cErr, course) => {
      if (cErr) return res.status(500).json({ error: cErr.message });
      if (!course) return res.status(404).json({ error: 'Course not found.' });

      db.get(
        `SELECT user_id, first_name, last_name, mcgill_email, user_type FROM users WHERE user_id = ?`,
        [targetId],
        (uErr, target) => {
          if (uErr) return res.status(500).json({ error: uErr.message });
          if (!target) return res.status(404).json({ error: 'User not found.' });

          db.get(
            `SELECT assignment_id, status FROM course_admin_assignments
             WHERE course_id = ? AND course_admin_id = ?`,
            [courseId, targetId],
            (aErr, existing) => {
              if (aErr) return res.status(500).json({ error: aErr.message });

              if (existing && existing.status === 'active') {
                return res.status(409).json({ error: 'This user is already an active course admin for this course.' });
              }

              const userPayload = {
                user_id: target.user_id,
                first_name: target.first_name,
                last_name: target.last_name,
                mcgill_email: target.mcgill_email,
                user_type: target.user_type,
              };

              if (existing && existing.status === 'revoked') {
                return db.run(
                  `UPDATE course_admin_assignments
                   SET status = 'active', assigned_by_admin_id = ?, assigned_at = CURRENT_TIMESTAMP
                   WHERE assignment_id = ?`,
                  [req.user.user_id, existing.assignment_id],
                  (upErr) => {
                    if (upErr) return res.status(500).json({ error: upErr.message });
                    return res.status(200).json({
                      message: 'Course admin reactivated.',
                      assignment_id: existing.assignment_id,
                      user: userPayload,
                    });
                  }
                );
              }

              db.run(
                `INSERT INTO course_admin_assignments (course_id, course_admin_id, assigned_by_admin_id, status)
                 VALUES (?, ?, ?, 'active')`,
                [courseId, targetId, req.user.user_id],
                function onInsert(insErr) {
                  if (insErr) return res.status(500).json({ error: insErr.message });
                  res.status(201).json({
                    message: 'Course admin assigned.',
                    assignment_id: this.lastID,
                    user: userPayload,
                  });
                }
              );
            }
          );
        }
      );
    });
  });
});

/**
 * DELETE /courses/:courseId/admins/:userId
 * Revokes course_admin assignment (status = revoked).
 */
router.delete('/:courseId/admins/:userId', requireAuth, loadUser, (req, res) => {
  const courseId = parseCourseIdParam(req, res);
  if (courseId == null) return;

  const adminUserId = parseInt(req.params.userId, 10);
  if (Number.isNaN(adminUserId) || adminUserId < 1) {
    return res.status(400).json({ error: 'Invalid user id.' });
  }

  requireCourseOwner(req, res, courseId, () => {
    db.run(
      `UPDATE course_admin_assignments
       SET status = 'revoked'
       WHERE course_id = ? AND course_admin_id = ? AND status = 'active'`,
      [courseId, adminUserId],
      function onRevoke(rErr) {
        if (rErr) return res.status(500).json({ error: rErr.message });
        if (this.changes === 0) {
          return res.status(404).json({ error: 'No active assignment found for that user on this course.' });
        }
        res.json({ message: 'Course admin access revoked.', course_id: courseId, user_id: adminUserId });
      }
    );
  });
});

/**
 * POST /courses/:courseId/invite/regenerate
 * New invitation token; previous invite links stop working.
 */
router.post('/:courseId/invite/regenerate', requireAuth, loadUser, (req, res) => {
  const courseId = parseCourseIdParam(req, res);
  if (courseId == null) return;

  requireCourseOwner(req, res, courseId, () => {
    const newToken = generateInviteToken();
    db.run(
      `UPDATE courses SET invitation_link = ? WHERE course_id = ?`,
      [newToken, courseId],
      function onUpdate(uErr) {
        if (uErr) return res.status(500).json({ error: uErr.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Course not found.' });
        res.json({
          message: 'Invite link regenerated.',
          invite_token: newToken,
          invite_url: inviteUrlForToken(newToken),
        });
      }
    );
  });
});

/**
 * DELETE /courses/:courseId
 * Hard-delete course (cascades per schema: enrollments, staff, ownerships, course-tied availabilities;
 * appointments.course_id set NULL).
 */
router.delete('/:courseId', requireAuth, loadUser, (req, res) => {
  const courseId = parseCourseIdParam(req, res);
  if (courseId == null) return;

  requireCourseOwner(req, res, courseId, () => {
    db.run(`DELETE FROM courses WHERE course_id = ?`, [courseId], function onDelete(dErr) {
      if (dErr) return res.status(500).json({ error: dErr.message });
      if (this.changes === 0) return res.status(404).json({ error: 'Course not found.' });
      res.json({ message: 'Course deleted.', course_id: courseId });
    });
  });
});

/**
 * PATCH /courses/:courseId
 * Course owner (general_admin) only. Updates course_name and/or description and/or close state.
 */
router.patch('/:courseId', requireAuth, loadUser, (req, res) => {
  const courseId = parseCourseIdParam(req, res);
  if (courseId == null) return;

  requireCourseOwner(req, res, courseId, () => {
    const { course_name, description, is_closed } = req.body || {};
    const updates = [];
    const params = [];

    if (course_name !== undefined) {
      const n = String(course_name).trim();
      if (!n) {
        return res.status(400).json({ error: 'course_name cannot be empty.' });
      }
      updates.push('course_name = ?');
      params.push(n);
    }

    if (description !== undefined) {
      const d = description === null || description === '' ? null : String(description).trim();
      updates.push('description = ?');
      params.push(d);
    }

    if (is_closed !== undefined) {
      if (typeof is_closed !== 'boolean') {
        return res.status(400).json({ error: 'is_closed must be a boolean.' });
      }
      updates.push('is_closed = ?');
      params.push(is_closed ? 1 : 0);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'Provide course_name, description, and/or is_closed to update.' });
    }

    params.push(courseId);

    db.run(
      `UPDATE courses SET ${updates.join(', ')} WHERE course_id = ?`,
      params,
      function onPatch(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Course not found.' });
        db.get(
          `SELECT course_id, course_code, course_name, course_term, course_year, description, is_closed
           FROM courses WHERE course_id = ?`,
          [courseId],
          (gErr, row) => {
            if (gErr) return res.status(500).json({ error: gErr.message });
            res.json({
              course: {
                ...row,
                is_closed: Number(row?.is_closed) > 0,
              },
            });
          }
        );
      }
    );
  });
});

/**
 * GET /courses
 * Courses the viewer may see (active/completed enrollment, active staff assignment, or ownership).
 * Query: course_year, course_term (optional exact filters).
 * invitation_link omitted from list (use detail for staff/owner invite).
 */
router.get('/', requireAuth, loadUser, (req, res) => {
  const uid = req.user.user_id;
  const params = [uid, uid, uid, uid, uid, uid];

  let whereExtra = '';
  if (req.query.course_year != null && String(req.query.course_year).trim() !== '') {
    const y = parseInt(req.query.course_year, 10);
    if (Number.isNaN(y)) {
      return res.status(400).json({ error: 'course_year must be an integer.' });
    }
    whereExtra += ' AND c.course_year = ?';
    params.push(y);
  }
  if (req.query.course_term != null && String(req.query.course_term).trim() !== '') {
    whereExtra += ' AND c.course_term = ?';
    params.push(String(req.query.course_term).trim());
  }

  const inSub = `
    SELECT course_id FROM course_enrollments
    WHERE user_id = ? AND enrollment_status IN ('active', 'completed')
    UNION
    SELECT course_id FROM course_admin_assignments
    WHERE course_admin_id = ? AND status = 'active'
    UNION
    SELECT course_id FROM course_ownerships
    WHERE general_admin_id = ? AND status = 'active'
  `;

  const sql = `
    SELECT
      c.course_id,
      c.course_code,
      c.course_name,
      c.course_term,
      c.course_year,
      c.description,
      c.is_closed,
      (
        SELECT e.enrollment_status
        FROM course_enrollments e
        WHERE e.course_id = c.course_id AND e.user_id = ?
        ORDER BY CASE e.enrollment_status WHEN 'active' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END
        LIMIT 1
      ) AS enrollment_status,
      (
        SELECT COUNT(*) FROM course_admin_assignments ca
        WHERE ca.course_id = c.course_id AND ca.course_admin_id = ? AND ca.status = 'active'
      ) AS is_staff,
      (
        SELECT COUNT(*) FROM course_ownerships co
        WHERE co.course_id = c.course_id AND co.general_admin_id = ? AND co.status = 'active'
      ) AS is_owner
    FROM courses c
    WHERE c.course_id IN (${inSub})
    ${whereExtra}
    ORDER BY c.course_year DESC, c.course_term ASC, c.course_code ASC
  `;

  db.all(sql, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    const courses = (rows || []).map((row) => ({
      course_id: row.course_id,
      course_code: row.course_code,
      course_name: row.course_name,
      course_term: row.course_term,
      course_year: row.course_year,
      description: row.description,
      is_closed: Number(row.is_closed) > 0,
      enrollment_status: row.enrollment_status || null,
      is_staff: Number(row.is_staff) > 0,
      is_owner: Number(row.is_owner) > 0,
    }));
    res.json({ courses });
  });
});

/**
 * GET /courses/:courseId
 * Course detail, staff, office_hours, course appointments; invite_token / invite_url for staff or owners only.
 */
router.get('/:courseId', requireAuth, loadUser, (req, res) => {
  const courseId = parseInt(req.params.courseId, 10);
  if (Number.isNaN(courseId) || courseId < 1) {
    return res.status(400).json({ error: 'Invalid course id.' });
  }

  const uid = req.user.user_id;

  const accessSql = `
    SELECT
      c.course_id,
      c.course_code,
      c.course_name,
      c.course_term,
      c.course_year,
      c.description,
      c.is_closed,
      c.invitation_link,
      (
        SELECT e.enrollment_status FROM course_enrollments e
        WHERE e.course_id = c.course_id AND e.user_id = ?
        ORDER BY CASE e.enrollment_status WHEN 'active' THEN 1 WHEN 'completed' THEN 2 ELSE 3 END LIMIT 1
      ) AS enrollment_status,
      (
        SELECT COUNT(*) FROM course_admin_assignments ca
        WHERE ca.course_id = c.course_id AND ca.course_admin_id = ? AND ca.status = 'active'
      ) AS is_staff,
      (
        SELECT COUNT(*) FROM course_ownerships co
        WHERE co.course_id = c.course_id AND co.general_admin_id = ? AND co.status = 'active'
      ) AS is_owner
    FROM courses c
    WHERE c.course_id = ?
  `;

  db.get(accessSql, [uid, uid, uid, courseId], (err, row) => {
    if (err) return res.status(500).json({ error: err.message });
    if (!row) {
      return res.status(404).json({ error: 'Course not found.' });
    }

    const isStaff = Number(row.is_staff) > 0;
    const isOwner = Number(row.is_owner) > 0;
    const enr = row.enrollment_status;
    const canView =
      isStaff || isOwner || enr === 'active' || enr === 'completed';

    if (!canView) {
      return res.status(403).json({ error: 'You do not have access to this course.' });
    }

    const showPrivateCourseSlots = isStaff || isOwner;
    const showInvite = isStaff || isOwner;

    const staffSql = `
      SELECT u.user_id, u.first_name, u.last_name, u.mcgill_email, u.user_type, u.department, u.staff_title
      FROM course_admin_assignments ca
      JOIN users u ON u.user_id = ca.course_admin_id
      WHERE ca.course_id = ? AND ca.status = 'active'
      ORDER BY u.last_name ASC, u.first_name ASC
    `;

    const ownersSql = `
      SELECT u.user_id, u.first_name, u.last_name, u.mcgill_email, u.user_type
      FROM course_ownerships co
      JOIN users u ON u.user_id = co.general_admin_id
      WHERE co.course_id = ? AND co.status = 'active'
      ORDER BY u.last_name ASC, u.first_name ASC
    `;

    // Course-tied availabilities: public slots (e.g. office hours) for everyone;
    // private slots (e.g. small-group meetings) only for staff/owners.
    const ohSql = showPrivateCourseSlots
      ? `SELECT a.*,
                cu.first_name AS creator_first_name,
                cu.last_name AS creator_last_name
         FROM availabilities a
         JOIN users cu ON cu.user_id = a.created_by
         WHERE a.course_id = ?
         ORDER BY datetime(a.start_time) ASC`
      : `SELECT a.*,
                cu.first_name AS creator_first_name,
                cu.last_name AS creator_last_name
         FROM availabilities a
         JOIN users cu ON cu.user_id = a.created_by
         WHERE a.course_id = ? AND a.visibility = 'public'
         ORDER BY datetime(a.start_time) ASC`;

    const apFrom = `
         FROM appointments a
         LEFT JOIN availabilities av ON av.availability_id = a.created_from_availability
         LEFT JOIN users cu ON cu.user_id = av.created_by
         LEFT JOIN (
           SELECT appointment_id, MIN(user_id) AS user_id
           FROM appointment_participants
           WHERE participant_role = 'host'
           GROUP BY appointment_id
         ) aph ON aph.appointment_id = a.appointment_id
         LEFT JOIN users hu ON hu.user_id = aph.user_id`;

    const apSql = showPrivateCourseSlots
      ? `SELECT a.appointment_id, a.course_id, a.capacity, a.location, a.start_time, a.end_time, a.visibility,
                a.ap_title, a.ap_description, a.scheduling_mode, a.status, a.created_at,
                COALESCE(cu.first_name, hu.first_name) AS creator_first_name,
                COALESCE(cu.last_name, hu.last_name) AS creator_last_name
         ${apFrom}
         WHERE a.course_id = ? AND a.status != 'cancelled'
         ORDER BY datetime(a.start_time) ASC`
      : `SELECT a.appointment_id, a.course_id, a.capacity, a.location, a.start_time, a.end_time, a.visibility,
                a.ap_title, a.ap_description, a.scheduling_mode, a.status, a.created_at,
                COALESCE(cu.first_name, hu.first_name) AS creator_first_name,
                COALESCE(cu.last_name, hu.last_name) AS creator_last_name
         ${apFrom}
         WHERE a.course_id = ? AND a.status != 'cancelled' AND a.visibility = 'public'
         ORDER BY datetime(a.start_time) ASC`;

    db.all(staffSql, [courseId], (sErr, staff) => {
      if (sErr) return res.status(500).json({ error: sErr.message });
      db.all(ownersSql, [courseId], (oErr, owners) => {
        if (oErr) return res.status(500).json({ error: oErr.message });
        db.all(ohSql, [courseId], (ohErr, office_hours) => {
          if (ohErr) return res.status(500).json({ error: ohErr.message });
          db.all(apSql, [courseId], (apErr, appointments) => {
            if (apErr) return res.status(500).json({ error: apErr.message });

            const course = {
              course_id: row.course_id,
              course_code: row.course_code,
              course_name: row.course_name,
              course_term: row.course_term,
              course_year: row.course_year,
              description: row.description,
              is_closed: Number(row.is_closed) > 0,
              enrollment_status: enr || null,
              is_staff: isStaff,
              is_owner: isOwner,
            };

            const payload = {
              course,
              staff: staff || [],
              owners: owners || [],
              office_hours: office_hours || [],
              appointments: appointments || [],
            };

            if (showInvite && row.invitation_link) {
              payload.invite_token = row.invitation_link;
              payload.invite_url = inviteUrlForToken(row.invitation_link);
            }

            res.json(payload);
          });
        });
      });
    });
  });
});

/**
 * POST /courses/join
 * Body: { token: string } — must match courses.invitation_link (opaque token).
 * Students only; creates or reactivates enrollment.
 */
router.post('/join', requireAuth, loadUser, (req, res) => {
  const { token } = req.body || {};
  if (!token || typeof token !== 'string' || !String(token).trim()) {
    return res.status(400).json({ error: 'token is required.' });
  }
  if (req.user.user_type !== 'student') {
    return res.status(403).json({ error: 'Only students can join a course with an invite link.' });
  }

  const trimmed = String(token).trim();

  db.get(
    `SELECT course_id, course_code, course_name, course_term, course_year, description, invitation_link
     FROM courses WHERE invitation_link = ?`,
    [trimmed],
    (err, course) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!course) {
        return res.status(404).json({ error: 'Invalid or expired invite.' });
      }

      db.get(
        `SELECT enrollment_id, enrollment_status FROM course_enrollments
         WHERE user_id = ? AND course_id = ?`,
        [req.user.user_id, course.course_id],
        (enrErr, enr) => {
          if (enrErr) return res.status(500).json({ error: enrErr.message });

          const finish = () => {
            res.status(200).json({
              message: 'Enrolled successfully.',
              course: {
                course_id: course.course_id,
                course_code: course.course_code,
                course_name: course.course_name,
                course_term: course.course_term,
                course_year: course.course_year,
                description: course.description,
              },
            });
          };

          if (enr && enr.enrollment_status === 'active') {
            return res.status(409).json({
              error: 'You are already enrolled in this course.',
              course: {
                course_id: course.course_id,
                course_code: course.course_code,
                course_name: course.course_name,
              },
            });
          }

          if (enr) {
            return db.run(
              `UPDATE course_enrollments
               SET enrollment_status = 'active', join_password = NULL
               WHERE enrollment_id = ?`,
              [enr.enrollment_id],
              (upErr) => {
                if (upErr) return res.status(500).json({ error: upErr.message });
                finish();
              }
            );
          }

          db.run(
            `INSERT INTO course_enrollments (user_id, course_id, enrollment_status)
             VALUES (?, ?, 'active')`,
            [req.user.user_id, course.course_id],
            (insertErr) => {
              if (insertErr) return res.status(500).json({ error: insertErr.message });
              finish();
            }
          );
        }
      );
    }
  );
});

/**
 * POST /courses
 * general_admin only. Sets invitation_link to a new opaque token; adds course_ownerships for creator.
 */
router.post('/', requireAuth, loadUser, (req, res) => {
  if (req.user.user_type !== 'general_admin') {
    return res.status(403).json({ error: 'Only general admins can create courses.' });
  }

  const { course_code, course_name, course_term, course_year, description } = req.body || {};

  if (!course_code || !course_name || !course_term || course_year == null) {
    return res.status(400).json({
      error: 'course_code, course_name, course_term, and course_year are required.',
    });
  }

  const code = String(course_code).trim();
  const name = String(course_name).trim();
  const term = String(course_term).trim();
  const year = parseInt(course_year, 10);

  if (!code || !name || !term || Number.isNaN(year)) {
    return res.status(400).json({ error: 'Invalid course fields.' });
  }

  const inviteToken = generateInviteToken();
  const desc = description != null && String(description).trim() ? String(description).trim() : null;

  db.run(
    `INSERT INTO courses (course_code, course_name, course_term, course_year, description, invitation_link)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [code, name, term, year, desc, inviteToken],
    function onInsert(insertErr) {
      if (insertErr) {
        if (
          insertErr.code === 'SQLITE_CONSTRAINT' ||
          String(insertErr.message).includes('UNIQUE')
        ) {
          return res.status(409).json({
            error: 'A course with this code, term, and year already exists.',
          });
        }
        return res.status(500).json({ error: insertErr.message });
      }

      const courseId = this.lastID;

      db.run(
        `INSERT INTO course_ownerships (course_id, general_admin_id, status)
         VALUES (?, ?, 'active')`,
        [courseId, req.user.user_id],
        (ownErr) => {
          if (ownErr) return res.status(500).json({ error: ownErr.message });

          db.get(
            `SELECT course_id, course_code, course_name, course_term, course_year, description, invitation_link
             FROM courses WHERE course_id = ?`,
            [courseId],
            (getErr, course) => {
              if (getErr) return res.status(500).json({ error: getErr.message });
              const invite_url = inviteUrlForToken(inviteToken);
              res.status(201).json({
                course,
                invite_token: inviteToken,
                invite_url,
              });
            }
          );
        }
      );
    }
  );
});

module.exports = router;
