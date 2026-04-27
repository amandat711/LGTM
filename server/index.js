// AMANDA TRAN
// SHIRLEY DING, 49.2% contribution
const express = require("express");
const cors = require("cors");
const session = require("express-session");
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

/** Must be explicit origins (not *) when credentials: true. localhost vs 127.0.0.1 are different origins. */
app.use(
  cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true,
  })
);
app.use(express.json());

app.use(
  session({
    secret: 'dev-session-secret', // TODO: change to the actual session secret/env variable when deploying to production
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: 'lax',
      secure: false,
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
