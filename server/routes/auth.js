const express = require('express');
const bcrypt = require('bcryptjs');
const db = require('../config/db');

const router = express.Router();

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function sqliteNow() {
  return new Date().toISOString().slice(0, 19);
}

const MIN_PASSWORD_LEN = 8;

function isAllowedMcGillEmail(email) {
  const e = normalizeEmail(email);
  return e.endsWith('@mail.mcgill.ca') || e.endsWith('@mcgill.ca');
}

/** @mail.mcgill.ca → student; @mcgill.ca (faculty/staff) → general_admin. Check mail subdomain before @mcgill.ca. */
function userTypeFromEmail(normalizedEmail) {
  if (normalizedEmail.endsWith('@mail.mcgill.ca')) {
    return 'student';
  }
  if (normalizedEmail.endsWith('@mcgill.ca')) {
    return 'general_admin';
  }
  return 'student';
}

/** Split "First Last" into two NOT NULL columns; single word uses it for both. */
function parseFullName(name) {
  const trimmed = String(name).trim();
  if (!trimmed) return null;
  const idx = trimmed.indexOf(' ');
  if (idx === -1) {
    return { first_name: trimmed, last_name: trimmed };
  }
  const last = trimmed.slice(idx + 1).trim();
  return {
    first_name: trimmed.slice(0, idx),
    last_name: last || trimmed,
  };
}

/** Attach to routes that require a logged-in user. */
function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ error: 'Not authenticated.' });
  }
  next();
}

router.post('/register', (req, res) => {
  const { name, email, password } = req.body || {};
  const parsed = name != null ? parseFullName(name) : null;

  if (!parsed) {
    return res.status(400).json({ error: 'Please enter your name.' });
  }
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }
  if (!isAllowedMcGillEmail(email)) {
    return res.status(400).json({
      error: 'Registration requires a @mail.mcgill.ca or @mcgill.ca email address.',
    });
  }
  if (password.length < MIN_PASSWORD_LEN) {
    return res.status(400).json({
      error: `Password must be at least ${MIN_PASSWORD_LEN} characters.`,
    });
  }

  const normalizedEmail = normalizeEmail(email);
  const userType = userTypeFromEmail(normalizedEmail);

  db.get(
    'SELECT user_id FROM users WHERE mcgill_email = ?',
    [normalizedEmail],
    (err, existing) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Registration failed.' });
      }
      if (existing) {
        return res.status(409).json({ error: 'An account with this email already exists.' });
      }

      bcrypt
        .hash(password, 10)
        .then((password_hash) => {
          db.run(
            `INSERT INTO users (first_name, last_name, mcgill_email, user_type, password_hash)
             VALUES (?, ?, ?, ?, ?)`,
            [parsed.first_name, parsed.last_name, normalizedEmail, userType, password_hash],
            function onInsert(insertErr) {
              if (insertErr) {
                if (
                  insertErr.code === 'SQLITE_CONSTRAINT' ||
                  String(insertErr.message).includes('UNIQUE')
                ) {
                  return res.status(409).json({
                    error: 'An account with this email already exists.',
                  });
                }
                console.error(insertErr);
                return res.status(500).json({ error: 'Registration failed.' });
              }

              const user = {
                user_id: this.lastID,
                first_name: parsed.first_name,
                last_name: parsed.last_name,
                mcgill_email: normalizedEmail,
                user_type: userType,
              };
              res.status(201).json({ user });
            }
          );
        })
        .catch((hashErr) => {
          console.error(hashErr);
          res.status(500).json({ error: 'Registration failed.' });
        });
    }
  );
});

router.post('/login', (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password are required.' });
  }

  const normalizedEmail = normalizeEmail(email);

  db.get(
    `SELECT user_id, first_name, last_name, mcgill_email, user_type, password_hash
     FROM users WHERE mcgill_email = ?`,
    [normalizedEmail],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Login failed.' });
      }

      if (!row) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }

      bcrypt.compare(password, row.password_hash).then((match) => {
        if (!match) {
          return res.status(401).json({ error: 'Invalid email or password.' });
        }

        req.session.userId = row.user_id;

        const now = sqliteNow();
        db.run(
          'UPDATE users SET last_login_at = ? WHERE user_id = ?',
          [now, row.user_id],
          (updateErr) => {
            if (updateErr) console.error(updateErr);
          }
        );

        const user = {
          user_id: row.user_id,
          first_name: row.first_name,
          last_name: row.last_name,
          mcgill_email: row.mcgill_email,
          user_type: row.user_type,
        };

        res.json({ user });
      }).catch((compareErr) => {
        console.error(compareErr);
        res.status(500).json({ error: 'Login failed.' });
      });
    }
  );
});

router.post('/logout', (req, res) => {
  req.session.destroy((destroyErr) => {
    if (destroyErr) {
      console.error(destroyErr);
      return res.status(500).json({ error: 'Could not log out.' });
    }
    res.json({ ok: true });
  });
});

router.get('/me', (req, res) => {
  if (!req.session?.userId) {
    return res.status(401).json({ user: null });
  }

  db.get(
    `SELECT user_id, first_name, last_name, mcgill_email, user_type
     FROM users WHERE user_id = ?`,
    [req.session.userId],
    (err, row) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Could not load session.' });
      }

      if (!row) {
        req.session.destroy(() => {});
        return res.status(401).json({ user: null });
      }

      res.json({ user: row });
    }
  );
});

module.exports = router;
module.exports.requireAuth = requireAuth;
