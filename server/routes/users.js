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
  const { type } = req.query;

  let query = `
    SELECT user_id, first_name, last_name, mcgill_email, user_type, department, staff_title
    FROM users
  `;
  let params = [];

  if (type === 'student') {
    query += ` WHERE user_type = ?`;
    params = ['student'];
  } else if (type === 'professor') {
    query += ` WHERE user_type IN (?, ?)`;
    params = ['course_admin', 'general_admin'];
  }

  query += ` ORDER BY user_id ASC`;

  db.all(query, params, (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json(rows.map(mapUser));
  });
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
