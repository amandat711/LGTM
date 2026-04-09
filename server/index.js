const express = require("express");
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 5000;

const db = require('./config/db');
const availabilitiesRouter = require('./routes/availabilities');
const appointmentsRouter = require('./routes/appointments');

app.use(cors());
app.use(express.json());

app.get("/api/health", (req, res) => {
  res.json({ message: "Backend is running" });
});

app.use('/availabilities', availabilitiesRouter);
app.use('/appointments', appointmentsRouter);

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