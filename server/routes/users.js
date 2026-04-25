// AMANDA TRAN

const express = require('express');
const router = express.Router();
const db = require('../config/db');

function mapUser(row) {
  if (!row) return null;

  return {
    id: row.user_id,
    firstName: row.first_name,
    lastName: row.last_name,
    name: `${row.first_name} ${row.last_name}`,
    email: row.mcgill_email,
    userType: row.user_type,
    role: row.user_type === 'student' ? 'student' : 'professor',
    department: row.department,
    staffTitle: row.staff_title,
  };
}

router.get('/', (req, res) => {
  const { type, q } = req.query;

  let query = `
    SELECT user_id, first_name, last_name, mcgill_email, user_type, department, staff_title
    FROM users
  `;
  const params = [];
  const conditions = [];

  if (type === 'student') {
    conditions.push('user_type = ?');
    params.push('student');
  } else if (type === 'professor') {
    conditions.push('user_type IN (?, ?)');
    params.push('course_admin', 'general_admin');
  }

  const qTrim = q != null && String(q).trim() ? String(q).trim() : '';
  if (qTrim) {
    conditions.push(
      `(LOWER(mcgill_email) LIKE ? OR LOWER(first_name) LIKE ? OR LOWER(last_name) LIKE ? OR LOWER(first_name || ' ' || last_name) LIKE ?)`
    );
    const qLike = `%${qTrim.toLowerCase()}%`;
    params.push(qLike, qLike, qLike, qLike);
  }

  if (conditions.length) {
    query += ` WHERE ${conditions.join(' AND ')}`;
  }

  query += ` ORDER BY last_name ASC, first_name ASC LIMIT 80`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows.map(mapUser));
  });
});

router.get('/professors', (req, res) => {
  db.all(
    `SELECT user_id, first_name, last_name, mcgill_email, user_type, department, staff_title
    FROM users
    WHERE user_type = 'general_admin'
    ORDER BY last_name ASC, first_name ASC`,
    (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      return res.json(rows.map(mapUser));
    }
  );
});

router.get('/:id', (req, res) => {
  db.get(
    `
      SELECT user_id, first_name, last_name, mcgill_email, user_type, department, staff_title
      FROM users
      WHERE user_id = ?
    `,
    [req.params.id],
    (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'User not found' });
      return res.json(mapUser(row));
    }
  );
});

module.exports = router;
