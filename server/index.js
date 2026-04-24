// AMANDA TRAN
const express = require("express");
const cors = require("cors");
const session = require("express-session");
const path = require("path");
require('dotenv').config();

const app = express();
const { DEFAULT_PORT } = require('./constants/config');
const PORT = process.env.PORT || DEFAULT_PORT;

const db = require('./config/db');
const availabilitiesRouter = require('./routes/availabilities');
const appointmentsRouter = require('./routes/appointments');
const authRouter = require('./routes/auth');
const heatmapsRouter = require('./routes/heatmaps');
const usersRouter = require('./routes/users');
const coursesRouter = require('./routes/courses');

const DEFAULT_ALLOWED_ORIGINS = ['http://localhost:3001', 'http://127.0.0.1:3001'];
const allowedOrigins = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((origin) => origin.trim())
  .filter(Boolean);
const corsOrigins = allowedOrigins.length > 0 ? allowedOrigins : DEFAULT_ALLOWED_ORIGINS;

app.use(
  cors({
    origin: corsOrigins,
    credentials: true,
  })
);
app.use(express.json());

const isProduction = process.env.NODE_ENV === 'production';
const sessionSecret = process.env.SESSION_SECRET || 'dev-session-secret';

// SOCS terminates TLS at the reverse proxy; trust it so secure cookies can be set.
app.set('trust proxy', true);

app.use(
  session({
    secret: sessionSecret,
    resave: false,
    saveUninitialized: false,
    proxy: true,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'none',
      secure: true,
    },
  })
);

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.use('/auth', authRouter);
app.use('/api/auth', authRouter);
app.use('/availabilities', availabilitiesRouter);
app.use('/appointments', appointmentsRouter);
app.use('/heatmaps', heatmapsRouter);
app.use('/users', usersRouter);
app.use('/courses', coursesRouter);

if (isProduction) {
  const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
  app.use(express.static(clientBuildPath));
  app.get(/.*/, (req, res) => {
    if (req.path.startsWith('/api/') || req.path.startsWith('/auth') || req.path.startsWith('/courses')) {
      return res.status(404).json({ error: 'Not found.' });
    }
    return res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

db.get("SELECT 1", (err, row) => {
  if (err) {
    console.error("Test query failed:", err);
  } else {
    console.log("DB is working");
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
