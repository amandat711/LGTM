// JOCELYNE LI (93% estimated contribution) => Calendar export/sync implementation and integration
const express = require('express');
const crypto = require('crypto');
const db = require('../config/db');
const { requireAuth } = require('./auth');
const { buildIcsDocument } = require('../utils/calendarIcs');

const router = express.Router();
const feedRateWindowMs = 60 * 1000;
const feedRateMaxPerWindow = 120;
const feedRateByIp = new Map();
const calendarSyncPublicBaseUrl = resolveCalendarSyncPublicBaseUrl();

function resolveCalendarSyncPublicBaseUrl() {
  const raw = String(process.env.CALENDAR_SYNC_PUBLIC_BASE_URL || '').trim();
  if (!raw) return null;
  try {
    const parsed = new URL(raw);
    return `${parsed.protocol}//${parsed.host}${parsed.pathname}`.replace(/\/+$/, '');
  } catch (err) {
    console.error('Invalid CALENDAR_SYNC_PUBLIC_BASE_URL. Falling back to request host.', err.message);
    return null;
  }
}

function dbGet(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function dbAll(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

function dbRun(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      resolve({ changes: this.changes, lastID: this.lastID });
    });
  });
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

function isFeedRateLimited(ip) {
  const now = Date.now();
  const prev = feedRateByIp.get(ip);
  if (!prev || now - prev.windowStartMs > feedRateWindowMs) {
    feedRateByIp.set(ip, { windowStartMs: now, count: 1 });
    return false;
  }
  prev.count += 1;
  if (prev.count > feedRateMaxPerWindow) return true;
  return false;
}

function createRawToken() {
  return crypto.randomBytes(32).toString('hex');
}

function buildFeedUrl(req, rawToken) {
  if (calendarSyncPublicBaseUrl) {
    return `${calendarSyncPublicBaseUrl}/calendar-sync/feed/${rawToken}.ics`;
  }
  const forwardedProto = req.get('x-forwarded-proto');
  const proto = forwardedProto ? String(forwardedProto).split(',')[0].trim() : req.protocol;
  const host = req.get('host');
  return `${proto}://${host}/calendar-sync/feed/${rawToken}.ics`;
}

async function createOrRotateFeedToken(userId) {
  const rawToken = createRawToken();
  const tokenHash = hashToken(rawToken);
  const existing = await dbGet('SELECT user_id FROM calendar_sync_feeds WHERE user_id = ?', [userId]);
  if (existing) {
    await dbRun(
      `UPDATE calendar_sync_feeds
       SET token_value = ?, token_hash = ?, rotated_at = CURRENT_TIMESTAMP, is_active = 1
       WHERE user_id = ?`,
      [rawToken, tokenHash, userId]
    );
  } else {
    await dbRun(
      `INSERT INTO calendar_sync_feeds (user_id, token_value, token_hash, is_active)
       VALUES (?, ?, ?, 1)`,
      [userId, rawToken, tokenHash]
    );
  }
  return { rawToken, tokenHash };
}

async function getAppointmentsForUser(userId) {
  const rows = await dbAll(
    `
    SELECT DISTINCT
      a.appointment_id,
      a.ap_title,
      a.ap_description,
      a.start_time,
      a.end_time,
      a.location,
      a.status,
      a.ics_sequence,
      host_u.first_name AS host_first_name,
      host_u.last_name AS host_last_name
    FROM appointments a
    JOIN appointment_participants ap
      ON ap.appointment_id = a.appointment_id
    LEFT JOIN appointment_participants host_ap
      ON host_ap.appointment_id = a.appointment_id
      AND host_ap.participant_role = 'host'
    LEFT JOIN users host_u
      ON host_u.user_id = host_ap.user_id
    WHERE ap.user_id = ?
      AND a.start_time IS NOT NULL
      AND a.end_time IS NOT NULL
    ORDER BY datetime(a.start_time) ASC
    `,
    [userId]
  );

  return rows.map((row) => ({
    id: row.appointment_id,
    title: row.ap_title || 'Appointment',
    startTime: row.start_time,
    endTime: row.end_time,
    description: [row.ap_description || '', row.host_first_name ? `Host: ${row.host_first_name} ${row.host_last_name || ''}`.trim() : '']
      .filter(Boolean)
      .join('\\n'),
    location: row.location || '',
    status: row.status || 'pending',
    sequence: Number(row.ics_sequence || 0),
  }));
}

router.get('/me', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    const row = await dbGet(
      `SELECT user_id, token_value, created_at, rotated_at, last_accessed_at
       FROM calendar_sync_feeds
       WHERE user_id = ? AND is_active = 1`,
      [userId]
    );

    let tokenValue = row?.token_value || null;
    if (!tokenValue) {
      const created = await createOrRotateFeedToken(userId);
      tokenValue = created.rawToken;
    }

    return res.json({
      feed_url: buildFeedUrl(req, tokenValue),
      created_at: row?.created_at || new Date().toISOString().slice(0, 19).replace('T', ' '),
      rotated_at: row?.rotated_at || null,
      last_accessed_at: row?.last_accessed_at || null,
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Could not load calendar sync feed.' });
  }
});

router.post('/me/rotate', requireAuth, async (req, res) => {
  try {
    const userId = Number(req.session.userId);
    const created = await createOrRotateFeedToken(userId);
    return res.json({
      feed_url: buildFeedUrl(req, created.rawToken),
      rotated_at: new Date().toISOString().slice(0, 19).replace('T', ' '),
    });
  } catch (err) {
    return res.status(500).json({ error: err.message || 'Could not rotate calendar feed token.' });
  }
});

router.get('/feed/:token.ics', async (req, res) => {
  try {
    if (isFeedRateLimited(req.ip || 'unknown')) {
      return res.status(429).send('Too many requests');
    }
    const rawToken = String(req.params.token || '').trim();
    if (!rawToken) {
      return res.status(404).send('Feed not found');
    }
    const tokenHash = hashToken(rawToken);

    const feed = await dbGet(
      `SELECT user_id
       FROM calendar_sync_feeds
       WHERE token_hash = ?
         AND is_active = 1`,
      [tokenHash]
    );
    if (!feed) {
      return res.status(404).send('Feed not found');
    }

    await dbRun(
      `UPDATE calendar_sync_feeds
       SET last_accessed_at = CURRENT_TIMESTAMP
       WHERE user_id = ?`,
      [feed.user_id]
    );

    const items = await getAppointmentsForUser(feed.user_id);
    const ics = buildIcsDocument(items);
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Last-Modified', new Date().toUTCString());
    res.setHeader('X-PUBLISHED-TTL', 'PT15M');
    return res.status(200).send(ics);
  } catch (err) {
    return res.status(500).send('Failed to build calendar feed');
  }
});

module.exports = router;
