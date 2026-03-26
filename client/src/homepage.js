import { useState, useEffect } from "react";
import logo1 from "./assets/logo1.png";

// ── helpers ──────────────────────────────────────────────────────────────────
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December",
];
const DAYS = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}
function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

// fake "available" days — every weekday except a few blocked ones
function isAvailable(year, month, day) {
  const d = new Date(year, month, day);
  const dow = d.getDay();
  if (dow === 0 || dow === 6) return false;
  // block a handful of days for realism
  const blocked = [3, 10, 17, 24];
  return !blocked.includes(day);
}

const TIME_SLOTS = [
  "9:00 AM","9:30 AM","10:00 AM","10:30 AM",
  "11:00 AM","11:30 AM","1:00 PM","1:30 PM",
  "2:00 PM","2:30 PM","3:00 PM","3:30 PM",
  "4:00 PM","4:30 PM",
];

// ── component ─────────────────────────────────────────────────────────────────
export default function HomePage() {
  const today = new Date();
  const [scrolled, setScrolled] = useState(false);
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedTime, setSelectedTime] = useState(null);
  const [confirmed, setConfirmed] = useState(false);
  const [hoveredDay, setHoveredDay] = useState(null);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const daysInMonth = getDaysInMonth(year, month);
  const firstDay = getFirstDayOfMonth(year, month);

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11); }
    else setMonth(m => m - 1);
    setSelectedDay(null);
    setSelectedTime(null);
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0); }
    else setMonth(m => m + 1);
    setSelectedDay(null);
    setSelectedTime(null);
  }

  function handleConfirm() {
    if (selectedDay && selectedTime) setConfirmed(true);
  }

  // ── render ──────────────────────────────────────────────────────────────────
  return (
    <div style={s.root}>
      {/* ── NAV ── */}
      <nav style={{ ...s.nav, boxShadow: scrolled ? "0 1px 6px rgba(0,0,0,0.5)" : "0 1px 0 #1f0404" }}>
        <div style={s.navInner}>
          <div style={s.logoWrap}>
            <img src={logo1} alt="McGill logo" style={s.logoImg} />
          </div>
          <div style={s.navLinks}>
            <span style={s.navLink}>Dashboard</span>
            <span style={{ ...s.navLink, color: "#E31429" }}>Book</span>
            <span style={s.navLink}>History</span>
          </div>
          <div style={s.profileIcon}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              stroke="#ccc" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </nav>

      {/* ── PAGE TITLE ── */}
      <div style={s.pageHeader}>
        <h1 style={s.pageTitle}>Book an Appointment</h1>
        <p style={s.pageSubtitle}>Select a date and time that works for you</p>
      </div>

      {/* ── BOOKING CARD ── */}
      <div style={s.cardWrap}>
        <div style={s.card}>

          {/* LEFT PANEL — info */}
          <div style={s.infoPanel}>
            <div style={s.infoBadge}>LGTM Health</div>
            <h2 style={s.infoName}>Booking Page </h2>

            <div style={s.infoMeta}>
              <MetaRow icon={clockIcon} label="30 minutes" />
              <MetaRow icon={videoIcon} label="In-Person or Video" />
              <MetaRow icon={globeIcon} label="Eastern Time — CA" />
            </div>

            <div style={s.divider} />

            <p style={s.infoDesc}>
              Schedule a one-on-one consultation with a McGill health professional.
              Bring any relevant documents or test results to your appointment.
            </p>

            {selectedDay && selectedTime && !confirmed && (
              <div style={s.selectionSummary}>
                <div style={s.summaryLabel}>Selected</div>
                <div style={s.summaryDate}>
                  {MONTHS[month]} {selectedDay}, {year}
                </div>
                <div style={s.summaryTime}>{selectedTime}</div>
                <button style={s.confirmBtn} onClick={handleConfirm}
                  onMouseEnter={e => e.currentTarget.style.background = "#c01020"}
                  onMouseLeave={e => e.currentTarget.style.background = "#E31429"}>
                  Confirm Booking
                </button>
              </div>
            )}

            {confirmed && (
              <div style={s.confirmedBox}>
                <div style={s.confirmedCheck}>✓</div>
                <div style={s.confirmedText}>Booking confirmed!</div>
                <div style={s.confirmedSub}>
                  {MONTHS[month]} {selectedDay}, {year} · {selectedTime}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT PANEL — calendar + times */}
          <div style={s.calendarPanel}>

            {/* Month nav */}
            <div style={s.monthNav}>
              <button style={s.navArrow} onClick={prevMonth}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="15 18 9 12 15 6" />
                </svg>
              </button>
              <span style={s.monthLabel}>{MONTHS[month]} {year}</span>
              <button style={s.navArrow} onClick={nextMonth}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="9 18 15 12 9 6" />
                </svg>
              </button>
            </div>

            {/* Day-of-week headers */}
            <div style={s.weekRow}>
              {DAYS.map(d => <div key={d} style={s.weekDay}>{d}</div>)}
            </div>

            {/* Calendar grid */}
            <div style={s.calGrid}>
              {Array.from({ length: firstDay }).map((_, i) => (
                <div key={"empty" + i} />
              ))}
              {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
                const avail = isAvailable(year, month, day);
                const sel = selectedDay === day;
                const hov = hoveredDay === day && avail && !sel;
                return (
                  <div
                    key={day}
                    style={{
                      ...s.calDay,
                      ...(avail ? s.calDayAvail : s.calDayDisabled),
                      ...(sel ? s.calDaySelected : {}),
                      ...(hov ? s.calDayHover : {}),
                    }}
                    onClick={() => {
                      if (!avail) return;
                      setSelectedDay(day);
                      setSelectedTime(null);
                      setConfirmed(false);
                    }}
                    onMouseEnter={() => avail && setHoveredDay(day)}
                    onMouseLeave={() => setHoveredDay(null)}
                  >
                    {day}
                    {avail && <div style={sel ? s.dotSelected : s.dot} />}
                  </div>
                );
              })}
            </div>

            {/* Time slots */}
            {selectedDay && !confirmed && (
              <div style={s.timesSection}>
                <div style={s.timesLabel}>
                  {MONTHS[month]} {selectedDay} — Available Times
                </div>
                <div style={s.timesGrid}>
                  {TIME_SLOTS.map(t => {
                    const isSel = selectedTime === t;
                    return (
                      <button
                        key={t}
                        style={{
                          ...s.timeSlot,
                          ...(isSel ? s.timeSlotSelected : {}),
                        }}
                        onMouseEnter={e => {
                          if (!isSel) e.currentTarget.style.borderColor = "#E31429";
                          if (!isSel) e.currentTarget.style.color = "#E31429";
                        }}
                        onMouseLeave={e => {
                          if (!isSel) e.currentTarget.style.borderColor = "#493C3C";
                          if (!isSel) e.currentTarget.style.color = "#ccc";
                        }}
                        onClick={() => { setSelectedTime(t); setConfirmed(false); }}
                      >
                        {t}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {confirmed && (
              <div style={s.timesSection}>
                <div style={s.timesLabel}>Your appointment is booked.</div>
                <button style={{ ...s.confirmBtn, marginTop: 16 }}
                  onClick={() => { setConfirmed(false); setSelectedDay(null); setSelectedTime(null); }}
                  onMouseEnter={e => e.currentTarget.style.background = "#c01020"}
                  onMouseLeave={e => e.currentTarget.style.background = "#E31429"}>
                  Book Another
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div style={{ height: 60 }} />

      {/* ── FOOTER ── */}
      <footer style={s.footer}>
        <span style={s.footerText}>© 2026 LGTM Health · McGill University</span>
      </footer>
    </div>
  );
}

// ── small icon rows ────────────────────────────────────────────────────────────
function MetaRow({ icon, label }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
      <span style={{ color: "#E31429", flexShrink: 0 }}>{icon}</span>
      <span style={{ fontSize: 13, color: "#aaa" }}>{label}</span>
    </div>
  );
}

const clockIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const videoIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="23 7 16 12 23 17 23 7"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/>
  </svg>
);
const globeIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
    strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="2" y1="12" x2="22" y2="12"/>
    <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
  </svg>
);

// ── styles ─────────────────────────────────────────────────────────────────────
const s = {
  root: {
      fontFamily: "'Georgia', 'Times New Roman', serif",
    background: "#ffffffff",
    color: "#1a1a1a",
    minHeight: "100vh",
    margin: 0,
    padding: 0,
    overflowX: "hidden",
  },

  // NAV
  nav: {
    position: "sticky",
    top: 0,
    background: "#ffffffff",
    zIndex: 100,
    transition: "box-shadow 0.2s",
  },
  navInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 28px",
    maxWidth: 1100,
    margin: "0 auto",
  },
  logoWrap: { display: "flex", alignItems: "center" },
  logoImg: { height: 36, width: "auto", display: "block", filter: "brightness(0) invert(1)" },
  navLinks: { display: "flex", gap: 28 },
  navLink: {
    fontSize: 13,
    color: "#aaa",
    cursor: "pointer",
    letterSpacing: "0.5px",
    fontFamily: "'Helvetica Neue', sans-serif",
  },
  profileIcon: {
    width: 34, height: 34, borderRadius: "50%",
    border: "1px solid #493C3C",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", background: "#1f0404",
  },

  // PAGE HEADER
  pageHeader: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "44px 28px 20px",
  },
  pageTitle: {
    fontSize: 32,
    fontWeight: 700,
    margin: "0 0 8px",
    color: "#fff",
    letterSpacing: "-0.5px",
  },
  pageSubtitle: {
    fontSize: 14,
    color: "#7a6a6a",
    margin: 0,
    fontFamily: "'Helvetica Neue', sans-serif",
  },

  // CARD
  cardWrap: {
    maxWidth: 1100,
    margin: "0 auto",
    padding: "0 28px",
  },
  card: {
     display: "flex",
    background: "#ffffffff",
    border: "1px solid #ede8e8",
    borderRadius: 6,
    overflow: "hidden",
    flexWrap: "wrap",
  },

  // INFO PANEL
  infoPanel: {
    flex: "0 0 280px",
    padding: "36px 32px",
    display: "flex",
    flexDirection: "column",
     background: "#fdf9f9", borderRight: "1px solid #ede8e8"
  },
  infoBadge: {
    display: "inline-block",
    background: "#E31429",
    color: "#fff",
    fontSize: 10,
    fontWeight: 700,
    letterSpacing: "1.5px",
    padding: "3px 8px",
    borderRadius: 2,
    marginBottom: 16,
    fontFamily: "'Helvetica Neue', sans-serif",
    width: "fit-content",
  },
  infoName: {
    fontSize: 20,
    fontWeight: 700,
    margin: "0 0 24px",
    color: "#000000ff",
    letterSpacing: "-0.3px",
    lineHeight: 1.3,
  },
  infoMeta: { marginBottom: 8 },
  divider: {
    height: 1,
    background: "#2a1414",
    margin: "16px 0 20px",
  },
  infoDesc: {
    fontSize: 12,
    color: "#7a6a6a",
    lineHeight: 1.8,
    margin: 0,
    fontFamily: "'Helvetica Neue', sans-serif",
  },
  selectionSummary: {
    marginTop: "auto",
    paddingTop: 24,
    borderTop: "1px solid #2a1414",
  },
  summaryLabel: {
    fontSize: 10,
    color: "#E31429",
    letterSpacing: "1.5px",
    fontWeight: 700,
    fontFamily: "'Helvetica Neue', sans-serif",
    marginBottom: 6,
  },
  summaryDate: {
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    marginBottom: 2,
  },
  summaryTime: {
    fontSize: 13,
    color: "#aaa",
    marginBottom: 16,
    fontFamily: "'Helvetica Neue', sans-serif",
  },
  confirmBtn: {
    background: "#E31429",
    color: "#fff",
    border: "none",
    borderRadius: 3,
    padding: "10px 20px",
    fontSize: 12,
    fontWeight: 600,
    cursor: "pointer",
    letterSpacing: "0.4px",
    transition: "background 0.15s",
    fontFamily: "'Helvetica Neue', sans-serif",
    width: "100%",
  },
  confirmedBox: {
    marginTop: "auto",
    paddingTop: 24,
    borderTop: "1px solid #2a1414",
    textAlign: "center",
  },
  confirmedCheck: {
    width: 44, height: 44,
    borderRadius: "50%",
    background: "rgba(227,20,41,0.15)",
    border: "1px solid #E31429",
    color: "#E31429",
    fontSize: 20,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 12px",
  },
  confirmedText: {
    fontSize: 15, fontWeight: 600, color: "#fff", marginBottom: 4,
  },
  confirmedSub: {
    fontSize: 12, color: "#7a6a6a",
    fontFamily: "'Helvetica Neue', sans-serif",
  },

  // CALENDAR PANEL
  calendarPanel: {
    flex: 1,
    padding: "36px 36px 36px",
    minWidth: 320,
  },
  monthNav: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  navArrow: {
    background: "transparent",
    border: "1px solid #2a1414",
    color: "#aaa",
    width: 32, height: 32,
    borderRadius: 3,
    cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    padding: 0,
    transition: "border-color 0.15s, color 0.15s",
  },
  monthLabel: {
    fontSize: 15,
    fontWeight: 600,
    color: "#fff",
    letterSpacing: "-0.2px",
  },
  weekRow: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    marginBottom: 8,
  },
  weekDay: {
    textAlign: "center",
    fontSize: 10,
    color: "#493C3C",
    fontWeight: 700,
    letterSpacing: "0.8px",
    padding: "0 0 6px",
    fontFamily: "'Helvetica Neue', sans-serif",
  },
  calGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(7, 1fr)",
    gap: 4,
  },
  calDay: {
    height: 38,
    borderRadius: 3,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    fontSize: 13,
    fontFamily: "'Helvetica Neue', sans-serif",
    position: "relative",
    cursor: "default",
    transition: "background 0.12s, color 0.12s",
    gap: 3,
  },
  calDayAvail: {
    color: "#333",
    cursor: "pointer",
    background: "transparent",
  },
  calDayDisabled: {
    color: "#ddd",
    cursor: "default",
  },
  calDaySelected: {
    background: "#E31429",
    color: "#fff",
    borderRadius: 3,
  },
  calDayHover: {
    background: "#fde8ea", color: "#E31429"
  },
  dot: {
    width: 4, height: 4,
    borderRadius: "50%",
    background: "#E31429",
    opacity: 0.6,
  },
  dotSelected: {
    width: 4, height: 4,
    borderRadius: "50%",
    background: "rgba(255,255,255,0.6)",
  },

  // TIME SLOTS
  timesSection: {
    marginTop: 28,
    paddingTop: 24,
    borderTop: "1px solid #1f0404",
  },
  timesLabel: {
    fontSize: 11,
    color: "#7a6a6a",
    letterSpacing: "0.8px",
    fontWeight: 600,
    marginBottom: 14,
    fontFamily: "'Helvetica Neue', sans-serif",
    textTransform: "uppercase",
  },
  timesGrid: {
    display: "flex",
    flexWrap: "wrap",
    gap: 8,
  },
  timeSlot: {
    padding: "7px 14px",
    borderRadius: 3,
    border: "1px solid #493C3C",
    background: "transparent",
    color: "#ccc",
    fontSize: 12,
    cursor: "pointer",
    fontFamily: "'Helvetica Neue', sans-serif",
    transition: "border-color 0.12s, color 0.12s",
    letterSpacing: "0.2px",
  },
  timeSlotSelected: {
    background: "#E31429",
    borderColor: "#E31429",
    color: "#fff",
  },

  // FOOTER
  footer: {
    borderTop: "1px solid #1f0404",
    padding: "20px 28px",
    textAlign: "center",
  },
  footerText: {
    fontSize: 11,
    color: "#493C3C",
    fontFamily: "'Helvetica Neue', sans-serif",
    letterSpacing: "0.5px",
  },
};