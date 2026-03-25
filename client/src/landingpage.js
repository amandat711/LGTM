import { useState, useEffect } from "react";

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 10);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div style={styles.root}>
      <nav
        style={{
          ...styles.nav,
          boxShadow: scrolled
            ? "0 1px 4px rgba(0,0,0,0.1)"
            : "0 1px 0 #e8e8e8",
        }}
      >
        <div style={styles.navInner}>
          <div style={styles.logoWrap}>
            <svg width="32" height="32" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="4" fill="#ED1B2F" />
              <text
                x="50"
                y="68"
                textAnchor="middle"
                fill="white"
                fontSize="52"
                fontWeight="700"
                fontFamily="Georgia, serif"
              >
                M
              </text>
            </svg>
            <span style={styles.logoText}>McGill</span>
          </div>

          <div style={styles.profileIcon}>
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#333"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
        </div>
      </nav>

      <section style={styles.hero}>
        <img
          src="https://www.mcgill.ca/about/files/about/mcgill_campus.jpg"
          alt="McGill Campus"
          style={styles.heroImg}
          onError={(e) => {
            const img = e.currentTarget;
            img.style.display = "none";
            if (img.parentElement) {
              img.parentElement.style.background = "#2c3e50";
            }
          }}
        />
        <div style={styles.heroOverlay} />
        <div style={styles.heroBody}>
          <h1 style={styles.heroTitle}>Some Headline phrase. Make it catchy!</h1>
          <button style={styles.heroBtn}>Find availabilities</button>
        </div>
      </section>

      <section style={styles.intro}>
        <p style={styles.introText}>
          Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
          consectetur adipiscing elit quisque faucibus ex sapien. Quisque
          faucibus ex sapien vitae pellentesque sem placerat. Vitae pellentesque
          sem placerat in id cursus mi.
        </p>
      </section>

      <section style={styles.featureSection}>
        <div style={styles.featureRow}>
          <div style={styles.featureTextCol}>
            <h2 style={styles.featureHeading}>
              All your appointments in one place!
            </h2>
            <p style={styles.featureDesc}>
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
              consectetur adipiscing elit quisque faucibus ex sapien. Quisque
              faucibus ex sapien vitae pellentesque sem placerat. Vitae
              pellentesque sem placerat in id cursus mi.
            </p>
          </div>
          <div style={styles.featureMediaCol}>
            <MapPlaceholder />
          </div>
        </div>
      </section>

      <section style={styles.featureSection}>
        <div style={styles.featureRow}>
          <div style={styles.featureMediaCol}>
            <div style={styles.imgPlaceholder} />
          </div>
          <div style={{ ...styles.featureTextCol, paddingLeft: 48 }}>
            <h2 style={styles.featureHeading}>Other feature!</h2>
            <p style={styles.featureDesc}>
              Lorem ipsum dolor sit amet consectetur adipiscing elit. Amet
              consectetur adipiscing elit quisque faucibus ex sapien. Quisque
              faucibus ex sapien vitae pellentesque sem placerat. Vitae
              pellentesque sem placerat in id cursus mi.
            </p>
          </div>
        </div>
      </section>

      <div style={{ height: 60 }} />

      <footer style={styles.footer}>
        <MapPlaceholder dark />
      </footer>
    </div>
  );
}

function MapPlaceholder({ dark }) {
  return (
    <div
      style={{
        ...styles.mapBox,
        background: dark ? "#111" : "#e8eaed",
      }}
    >
      <svg
        width="100%"
        height="100%"
        style={{
          position: "absolute",
          inset: 0,
          opacity: dark ? 0.15 : 0.3,
        }}
      >
        {[20, 40, 60, 80].map((p) => (
          <line
            key={"h" + p}
            x1="0"
            y1={`${p}%`}
            x2="100%"
            y2={`${p}%`}
            stroke={dark ? "#fff" : "#aaa"}
            strokeWidth="1"
          />
        ))}
        {[20, 40, 60, 80].map((p) => (
          <line
            key={"v" + p}
            x1={`${p}%`}
            y1="0"
            x2={`${p}%`}
            y2="100%"
            stroke={dark ? "#fff" : "#aaa"}
            strokeWidth="1"
          />
        ))}
      </svg>

      <div style={{ ...styles.mapPin, background: dark ? "#555" : "#666" }}>
        <span style={styles.mapPinLetter}>R</span>
      </div>
    </div>
  );
}

const styles = {
  root: {
    fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
    background: "#fff",
    color: "#1a1a1a",
    margin: 0,
    padding: 0,
    overflowX: "hidden",
  },

  nav: {
    position: "sticky",
    top: 0,
    background: "#fff",
    zIndex: 100,
    transition: "box-shadow 0.2s",
  },
  navInner: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "10px 20px",
    maxWidth: 960,
    margin: "0 auto",
  },
  logoWrap: {
    display: "flex",
    alignItems: "center",
    gap: 8,
  },
  logoText: {
    fontSize: 22,
    fontWeight: 700,
    color: "#ED1B2F",
    fontFamily: "Georgia, serif",
    letterSpacing: "-0.5px",
  },
  profileIcon: {
    width: 36,
    height: 36,
    borderRadius: "50%",
    border: "1px solid #ddd",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
  },

  hero: {
    position: "relative",
    width: "100%",
    height: 300,
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
  },
  heroImg: {
    position: "absolute",
    inset: 0,
    width: "100%",
    height: "100%",
    objectFit: "cover",
    objectPosition: "center 60%",
  },
  heroOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.38)",
  },
  heroBody: {
    position: "relative",
    zIndex: 2,
    width: "100%",
    padding: "0 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: 20,
  },
  heroTitle: {
    color: "#fff",
    fontSize: 28,
    fontWeight: 700,
    textAlign: "center",
    margin: 0,
    textShadow: "0 1px 4px rgba(0,0,0,0.3)",
    letterSpacing: "-0.5px",
  },
  heroBtn: {
    background: "transparent",
    color: "#fff",
    border: "1.5px solid #fff",
    borderRadius: 2,
    padding: "8px 24px",
    fontSize: 14,
    cursor: "pointer",
    letterSpacing: "0.2px",
  },

  intro: {
    padding: "40px 20px",
    maxWidth: 700,
    margin: "0 auto",
  },
  introText: {
    fontSize: 14,
    color: "#333",
    lineHeight: 1.7,
    textAlign: "left",
    margin: 0,
  },

  featureSection: {
    padding: "20px 20px 40px",
    maxWidth: 900,
    margin: "0 auto",
  },
  featureRow: {
    display: "flex",
    alignItems: "center",
    gap: 40,
    flexWrap: "wrap",
  },
  featureTextCol: {
    flex: 1,
    minWidth: 220,
  },
  featureMediaCol: {
    flex: 1.2,
    minWidth: 260,
  },
  featureHeading: {
    fontSize: 22,
    fontWeight: 700,
    margin: "0 0 16px",
    color: "#1a1a1a",
    letterSpacing: "-0.3px",
  },
  featureDesc: {
    fontSize: 13,
    color: "#444",
    lineHeight: 1.75,
    margin: 0,
  },

  mapBox: {
    width: "100%",
    height: 200,
    borderRadius: 4,
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mapPin: {
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    zIndex: 2,
    boxShadow: "0 2px 6px rgba(0,0,0,0.3)",
  },
  mapPinLetter: {
    color: "#fff",
    fontSize: 14,
    fontWeight: 700,
  },

  imgPlaceholder: {
    width: "100%",
    height: 200,
    background: "#d0d0d0",
    borderRadius: 4,
  },

  footer: {
    width: "100%",
    height: 180,
    background: "#111",
  },
};