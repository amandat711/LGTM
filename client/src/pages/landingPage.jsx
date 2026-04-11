import { useState, useEffect } from "react";
import logo1 from "../assets/logo1.png";
import header from "../assets/header.png";
import { useNavigate } from "react-router-dom";
import { getUsers } from "../api/users";
import "../styles/LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);
  const [demoUsers, setDemoUsers] = useState({ student: null, professor: null });

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    let active = true;

    async function loadDemoUsers() {
      try {
        const [students, professors] = await Promise.all([
          getUsers("student"),
          getUsers("professor"),
        ]);

        if (!active) return;

        setDemoUsers({
          student: students[0] || null,
          professor: professors[0] || null,
        });
      } catch (err) {
        if (!active) return;
        setDemoUsers({ student: null, professor: null });
      }
    }

    loadDemoUsers();
    return () => {
      active = false;
    };
  }, []);

  const studentDashboardPath = demoUsers.student ? `/dashboard/student/${demoUsers.student.id}` : "/";
  const professorDashboardPath = demoUsers.professor ? `/dashboard/professor/${demoUsers.professor.id}` : "/";
  const heatmapPath = demoUsers.student
    ? `/heatmap/student/1/${demoUsers.student.id}`
    : "/heatmap/1";

  return (
    <div className="landing-page">
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className={`landing-top-bar${scrolled ? " landing-top-bar-scrolled" : ""}`}>
        <div className="landing-top-bar-content">
          <div className="brand-area">
            <img src={logo1} alt="McGill logo" className="brand-logo" />
          </div>
          <div className="landing-top-bar-actions">
            <button className="login-button" onClick={() => navigate(studentDashboardPath)}>
              Login
            </button>
            <button className="profile-button" aria-label="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
              //the profile icon on the right of the nav bar
                stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <div className="hero-section">
        <img src={header} alt="Header background" className="hero-image" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-subtitle">McGill University</p>
          <h1 className="hero-title">Some Headline phrase<br /></h1>
          <button className="hero-button" onClick={() => navigate(studentDashboardPath)}>
            Find availabilities
          </button>
        </div>
      </div>

      {/* ── Intro ──────────────────────────────────────── */}
      <section className="intro-section">
        <p className="intro-text">
          Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
          consectetur adipiscing elit quisque faucibus ex sapien. Quisque
          faucibus ex sapien vitae pellentesque sem placerat. Vitae pellentesque
          sem placerat in id cursus mi.
        </p>
      </section>

      {/* ── Feature 1 ──────────────────────────────────── */}
      <section className="feature-section">
        <div className="feature-row">
          <div className="feature-text">
            <h2 className="feature-title">All your appointments in one place!</h2>
            <p className="feature-text-block">
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
              consectetur adipiscing elit quisque faucibus ex sapien. Quisque
              faucibus ex sapien vitae pellentesque sem placerat. Vitae
              pellentesque sem placerat in id cursus mi.
            </p>
            <button className="feature-button" onClick={() => navigate(professorDashboardPath)}>
              Get started
            </button>
          </div>
        </div>
      </section>

      {/* ── Feature 2 ──────────────────────────────────── */}
      <section className="feature-section feature-section-light">
        <div className="feature-row feature-row-reversed">
          <div className="feature-image-area">
            <div className="image-placeholder" />
          </div>
          <div className="feature-text">
            <h2 className="feature-title">Other feature!</h2>
            <p className="feature-text-block">
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
              consectetur adipiscing elit quisque faucibus ex sapien. Quisque
              faucibus ex sapien vitae pellentesque sem placerat. Vitae
              pellentesque sem placerat in id cursus mi.
            </p>
            <button className="feature-button" onClick={() => navigate(heatmapPath)}>
              Learn more
            </button>
          </div>
        </div>
      </section>

      <div style={{ height: 60 }} />

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="page-footer">
        <div className="footer-content">
          <div className="footer-brand">
            <img src={logo1} alt="McGill logo" className="footer-logo" />
            <p className="footer-tagline">McGill University Booking System</p>
          </div>
          <div className="footer-links">
            <button className="footer-link">Contact</button>
            <button className="footer-link">Privacy</button>
          </div>
        </div>
        <p className="footer-copy">© 2026 McGill University. All rights reserved.</p>
      </footer>
    </div>
  );
}
