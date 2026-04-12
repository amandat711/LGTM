const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

const db = require('./config/db');
const availabilitiesRouter = require('./routes/availabilities');
const appointmentsRouter = require('./routes/appointments');
const heatmapsRouter = require('./routes/heatmaps');
const usersRouter = require('./routes/users');

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.use('/availabilities', availabilitiesRouter);
app.use('/appointments', appointmentsRouter);
app.use('/heatmaps', heatmapsRouter);
app.use('/users', usersRouter);

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
