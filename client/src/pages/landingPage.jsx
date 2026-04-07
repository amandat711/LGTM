import { useState, useEffect } from "react";
import logo1 from "../assets/logo1.png";
import header from "../assets/header.png";
import { useNavigate } from "react-router-dom";
import "../styles/LandingPage.css";

export default function LandingPage() {
  const navigate = useNavigate();
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="lp-root">
      {/* ── Navbar ─────────────────────────────────────── */}
      <nav className={`lp-nav${scrolled ? " lp-nav--scrolled" : ""}`}>
        <div className="lp-nav-inner">
          <div className="lp-logo-wrap">
            <img src={logo1} alt="McGill logo" className="lp-logo-img" style={{ height: '100px', width: '100px', objectFit: 'contain' }} />
          </div>
          <div className="lp-nav-right">
            <button className="lp-nav-link" onClick={() => navigate("/login")}>
              Login
            </button>
            <button className="lp-profile-icon" aria-label="Profile">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none"
                stroke="#333" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </button>
          </div>
        </div>
      </nav>

      {/* ── Hero ───────────────────────────────────────── */}
      <div className="lp-hero">
        <img src={header} alt="Header background" className="lp-hero-img" />
        <div className="lp-hero-overlay" />
        <div className="lp-hero-body">
          <p className="lp-hero-eyebrow">McGill University</p>
          <h1 className="lp-hero-title">Some Headline phrase<br /></h1>
          <button className="lp-hero-btn" onClick={() => navigate("/student")}>
            Find availabilities
          </button>
        </div>
      </div>

      {/* ── Intro ──────────────────────────────────────── */}
      <section className="lp-intro">
        <p className="lp-intro-text">
          Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
          consectetur adipiscing elit quisque faucibus ex sapien. Quisque
          faucibus ex sapien vitae pellentesque sem placerat. Vitae pellentesque
          sem placerat in id cursus mi.
        </p>
      </section>

      {/* ── Feature 1 ──────────────────────────────────── */}
      <section className="lp-feature-section">
        <div className="lp-feature-row">
          <div className="lp-feature-text">
            <h2 className="lp-feature-heading">All your appointments in one place!</h2>
            <p className="lp-feature-desc">
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
              consectetur adipiscing elit quisque faucibus ex sapien. Quisque
              faucibus ex sapien vitae pellentesque sem placerat. Vitae
              pellentesque sem placerat in id cursus mi.
            </p>
            <button className="lp-feature-btn" onClick={() => navigate("/professor")}>
              Get started
            </button>
          </div>
        </div>
      </section>

      {/* ── Feature 2 ──────────────────────────────────── */}
      <section className="lp-feature-section lp-feature-section--alt">
        <div className="lp-feature-row lp-feature-row--reverse">
          <div className="lp-feature-media">
            <div className="lp-img-placeholder" />
          </div>
          <div className="lp-feature-text">
            <h2 className="lp-feature-heading">Other feature!</h2>
            <p className="lp-feature-desc">
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
              consectetur adipiscing elit quisque faucibus ex sapien. Quisque
              faucibus ex sapien vitae pellentesque sem placerat. Vitae
              pellentesque sem placerat in id cursus mi.
            </p>
            <button className="lp-feature-btn" onClick={() => navigate("/heatmap")}>
              Learn more
            </button>
          </div>
        </div>
      </section>

      <div style={{ height: 60 }} />

      {/* ── Footer ─────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-footer-inner">
          <div className="lp-footer-brand">
            <img src={logo1} alt="McGill logo" className="lp-footer-logo" />
            <p className="lp-footer-tagline">McGill University Booking System</p>
          </div>
          <div className="lp-footer-links">
            <button className="lp-footer-link" onClick={() => navigate("/heatmap")}>Dashboard</button>
            <button className="lp-footer-link">Contact</button>
            <button className="lp-footer-link">Privacy</button>
          </div>
        </div>
        <p className="lp-footer-copy">© 2026 McGill University. All rights reserved.</p>
      </footer>
    </div>
  );
}
