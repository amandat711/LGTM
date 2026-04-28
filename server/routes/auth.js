const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const db = require('../config/db');
const {
  sendForgotPasswordEmail,
  sendPasswordChangedEmail,
} = require('../lib/mailer');
const { MIN_PASSWORD_LEN, RESET_TOKEN_TTL_MS } = require('../constants/auth');
const { FRONTEND_URL } = require('../constants/config');

const router = express.Router();

function normalizeEmail(email) {
  return String(email).trim().toLowerCase();
}

function sqliteNow() {
  return new Date().toISOString().slice(0, 19);
}

function hashResetToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function addMsToNowAsSqliteDate(ms) {
  return new Date(Date.now() + ms).toISOString().slice(0, 19);
}

function buildResetLink(token) {
  const base = FRONTEND_URL.replace(/\/+$/, '');
  return `${base}/reset-password?token=${encodeURIComponent(token)}`;
}

/** Temporary dev-only: non-McGill inbox for local testing (remove when no longer needed). */
const AUTH_EMAIL_DOMAIN_EXCEPTION = 'amandatxl711@gmail.com';

function isAllowedMcGillEmail(email) {
  const e = normalizeEmail(email);
  if (e === AUTH_EMAIL_DOMAIN_EXCEPTION) return true;
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
  const { name, email, password, department, staffTitle } = req.body || {};
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
  const isStaffMcGillEmail =
    normalizedEmail.endsWith('@mcgill.ca') && !normalizedEmail.endsWith('@mail.mcgill.ca');
  const normalizedDepartment = String(department ?? '').trim();
  const normalizedStaffTitle = String(staffTitle ?? '').trim();

  if (isStaffMcGillEmail) {
    if (!normalizedDepartment) {
      return res.status(400).json({ error: 'Department is required for @mcgill.ca registration.' });
    }
    if (!normalizedStaffTitle) {
      return res.status(400).json({ error: 'Staff title is required for @mcgill.ca registration.' });
    }
  }

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
            `INSERT INTO users (
               first_name,
               last_name,
               mcgill_email,
               user_type,
               password_hash,
               department,
               staff_title
             )
             VALUES (?, ?, ?, ?, ?, ?, ?)`,
            [
              parsed.first_name,
              parsed.last_name,
              normalizedEmail,
              userType,
              password_hash,
              normalizedDepartment || null,
              normalizedStaffTitle || null,
            ],
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
                department: normalizedDepartment || null,
                staff_title: normalizedStaffTitle || null,
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

router.post('/forgot-password', (req, res) => {
  const { email } = req.body || {};

  if (!email || !isAllowedMcGillEmail(email)) {
    return res.json({
      ok: true,
      message:
        'If an account exists for that address, password reset instructions have been sent.',
    });
  }

  const normalizedEmail = normalizeEmail(email);
  db.get(
    'SELECT user_id, mcgill_email FROM users WHERE mcgill_email = ?',
    [normalizedEmail],
    (err, user) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Could not process forgot-password request.' });
      }

      // Do not reveal whether the account exists.
      if (!user) {
        return res.json({
          ok: true,
          message:
            'If an account exists for that address, password reset instructions have been sent.',
        });
      }

      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = hashResetToken(rawToken);
      const expiresAt = addMsToNowAsSqliteDate(RESET_TOKEN_TTL_MS);

      db.run(
        'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, ?)',
        [user.user_id, tokenHash, expiresAt],
        async (insertErr) => {
          if (insertErr) {
            console.error(insertErr);
            return res.status(500).json({ error: 'Could not process forgot-password request.' });
          }

          try {
            const resetLink = buildResetLink(rawToken);
            await sendForgotPasswordEmail({ to: user.mcgill_email, resetLink });
          } catch (emailErr) {
            console.error(emailErr);
            return res.status(500).json({ error: 'Could not send reset email.' });
          }

          return res.json({
            ok: true,
            message:
              'If an account exists for that address, password reset instructions have been sent.',
          });
        }
      );
    }
  );
});

router.post('/reset-password', (req, res) => {
  const { token, newPassword } = req.body || {};

  if (!token || typeof token !== 'string') {
    return res.status(400).json({ error: 'Invalid reset token.' });
  }
  if (!newPassword || newPassword.length < MIN_PASSWORD_LEN) {
    return res
      .status(400)
      .json({ error: `Password must be at least ${MIN_PASSWORD_LEN} characters.` });
  }

  const tokenHash = hashResetToken(token);
  const now = sqliteNow();

  db.get(
    `SELECT token_id, user_id, expires_at, used_at
     FROM password_reset_tokens
     WHERE token_hash = ?`,
    [tokenHash],
    (err, tokenRow) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: 'Could not reset password.' });
      }
      if (!tokenRow || tokenRow.used_at || tokenRow.expires_at <= now) {
        return res.status(400).json({ error: 'Reset token is invalid or expired.' });
      }

      bcrypt
        .hash(newPassword, 10)
        .then((password_hash) => {
          db.run(
            'UPDATE users SET password_hash = ? WHERE user_id = ?',
            [password_hash, tokenRow.user_id],
            (updateUserErr) => {
              if (updateUserErr) {
                console.error(updateUserErr);
                return res.status(500).json({ error: 'Could not reset password.' });
              }

              db.run(
                'UPDATE password_reset_tokens SET used_at = ? WHERE token_id = ?',
                [now, tokenRow.token_id],
                (markUsedErr) => {
                  if (markUsedErr) {
                    console.error(markUsedErr);
                    return res.status(500).json({ error: 'Could not reset password.' });
                  }

                  db.get(
                    `SELECT mcgill_email FROM users WHERE user_id = ?`,
                    [tokenRow.user_id],
                    (emailLookupErr, userRow) => {
                      if (emailLookupErr) {
                        console.error('[mailer] password-changed lookup failed:', emailLookupErr);
                      } else if (userRow?.mcgill_email) {
                        sendPasswordChangedEmail({ to: userRow.mcgill_email }).catch((emailErr) => {
                          console.error('[mailer] password changed email failed:', emailErr);
                        });
                      }
                    }
                  );

                  return res.json({ ok: true, message: 'Password reset successful.' });
                }
              );
            }
          );
        })
        .catch((hashErr) => {
          console.error(hashErr);
          return res.status(500).json({ error: 'Could not reset password.' });
        });
    }
  );
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
