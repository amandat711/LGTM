//AMANDA TRAN

import { useState, useRef } from "react";
import LGTMLogo2 from "../assets/LGTMLogo2.png";
import header from "../assets/header.png";
import heatmapPreview from "../assets/HeatmapPreview.png";
import { useNavigate } from "react-router-dom";
import Navbar from "../components/Navbar";
import "../styles/LandingPage.css";


//PERSONNAL CODE
//________________________________________________________________________________________________//
export default function LandingPage() {
  // This lets buttons move the user to another page
  // without reloading the whole site.
  const navigate = useNavigate();

  // Controls visibility of the heatmap explainer section.
  const [showHeatmapDetail, setShowHeatmapDetail] = useState(false);

  // Ref for scrolling to the heatmap explainer section.
  const heatmapSectionRef = useRef(null);

  //START of the LANDING PAGE design
  //________________________________________________________________________________________________//
  return (
    <div className="landing-page">
      {/* Top navigation bar */}
      <div className="landing-top-bar">
        <Navbar
          logo={LGTMLogo2}
          onLeftClick={() => navigate('/')}
          actions={[
            { label: "Login", onClick: () => navigate("/login") },
          ]}
        />
      </div>

      {/* Hero section with image, title, and main button */}
      <div className="hero-section">
        <img src={header} alt="Header background" className="hero-image" />
        <div className="hero-overlay" />
        <div className="hero-content">
          <p className="hero-subtitle">McGill University</p>
          <h1 className="hero-title">Your McGill Booking Hub<br /></h1>
          <button className="hero-button" onClick={() => navigate("/login")}>
            Find availabilities
          </button>
        </div>
      </div>

      {/* Intro text */}
      <section className="intro-section">
        <p className="intro-text">
          LGTM is more than a booking tool.
          It combines real-time availability, appointment tracking, and heatmap-based scheduling into one streamlined platform,
          giving McGill students and professors the easiest way to coordinate meetings without the usual confusion.
        </p>
      </section>

      {/* First feature section */}
      <section className="feature-section">
        <div className="feature-row">
          <div className="feature-text">
            <h2 className="feature-title">All your appointments in one place!</h2>
            <p className="feature-text-block">
              LGTM keeps meetings, office hours, and upcoming bookings organized in one clear dashboard.
              Students can quickly check what is coming up, while professors can manage schedules without digging through scattered emails or calendars.
            </p>
            <button className="feature-button" onClick={() => navigate("/login")}>
              Get started
            </button>
          </div>
        </div>
      </section>

      {/* Second feature section */}
      <section className="feature-section feature-section-light">
        <div className="feature-row feature-row-reversed">
          <div className="feature-image-area">
            {/*Heatmap preview image displayed*/}
            <img src={heatmapPreview} alt="Heatmap preview" className="feature-preview-image" />
          </div>
          <div className="feature-text">
            <h2 className="feature-title">Additional features</h2>
            <p className="feature-text-block">
              With heatmaps and shared availability, LGTM makes it easier to spot the times that work best for everyone.
              Instead of endless back-and-forth, students and professors can make decisions quickly and book with confidence.
            </p>
            {/* "Learn more" = the trigger*/}
            <button
              className="feature-button"
              onClick={() => {
                setShowHeatmapDetail(true);
                heatmapSectionRef.current?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              Learn more
            </button>
          </div>
        </div>
      </section>

      {/* Accordion  — always in the DOM, shown/hidden via display */}
      <section
        className="accordion-section"
        ref={heatmapSectionRef}
        style={{ display: showHeatmapDetail ? "block" : "none" }}
      >
        {/* close the "panel by clicking the link" Usually users dont bother with it */}
        <button
          className="accordion-trigger"
          onClick={() => setShowHeatmapDetail(!showHeatmapDetail)}
          aria-expanded={showHeatmapDetail}
        >

          <span>How does shared availability work?</span>

        </button>
        <div className="accordion-body">
          <p>
            Instructors define their available office-hour windows directly within LGTM. Students then indicate
            which of those time slots are compatible with their own schedules. The platform aggregates all
            responses in real time and renders them as a unified availability heatmap — giving both instructors
            and students an immediate, accurate view of the best times to meet. This eliminates the need for
            manual coordination, repeated email exchanges, or reliance on scheduling tools outside the course
            management workflow.
          </p>
        </div>
      </section>

      <div />


      {/* PERSONAL STYLES COUPLED WITH PRE-EXISTING DESIGN VISUAL ELEMENTS*/}
      {/* Footer design adapted from the McGill website footer  : https://www.mcgill.ca  */}
      <footer className="page-footer" data-elastic-exclude>
        {/* Top footer links for students, faculty/staff, and alumni */}
        <div className="footer-page-bottom">
          <div className="footer-audience-grid">
            <div>
              <p className="footer-column-title">For current students</p>
              <ul className="footer-link-list">
                <li><a href="https://outlook.office365.com/owa/mcgill.ca?students">Email (Outlook)</a></li>
                <li><a href="https://mycourses2.mcgill.ca/">myCourses</a></li>
                <li><a href="https://www.mcgill.ca/minerva/">Minerva</a></li>
                <li><a href="https://www.mcgill.ca/mymcgill/?students">myMcGill</a></li>
                <li><a href="https://www.mcgill.ca/library/">Libraries</a></li>
                <li><a href="https://www.mcgill.ca/study/">Programs and courses</a></li>
                <li><a href="https://www.mcgill.ca/resources-services-students">Resources and services</a></li>
                <li><a href="https://www.mcgill.ca/facilities/contact/fcc">Facilities Call Centre</a></li>
              </ul>
            </div>

            <div>
              <p className="footer-column-title">For faculty & staff</p>
              <ul className="footer-link-list">
                <li><a href="https://outlook.office365.com/owa/mcgill.ca?staff">Email (Outlook)</a></li>
                <li><a href="https://www.mcgill.ca/minerva/">Minerva</a></li>
                <li><a href="https://workday.mcgill.ca/">Workday</a></li>
                <li><a href="https://mycourses2.mcgill.ca/">myCourses</a></li>
                <li><a href="https://www.mcgill.ca/hr/">Human resources</a></li>
                <li><a href="https://www.mcgill.ca/mymcgill/?staff">myMcGill</a></li>
                <li><a href="https://www.mcgill.ca/inb/">Banner INB</a></li>
                <li><a href="https://www.mcgill.ca/resources-services-faculty-staff">Resources and services</a></li>
                <li><a href="https://www.mcgill.ca/teaching-academic-programs/">Teaching and Academic Programs</a></li>
                <li><a href="https://www.mcgill.ca/facilities/contact/fcc">Facilities Call Centre</a></li>
              </ul>
            </div>

            <div>
              <p className="footer-column-title">For alumni & friends</p>
              <ul className="footer-link-list">
                <li><a href="https://outlook.office365.com/owa/McGill.mail.onmicrosoft.com">Alumni email</a></li>
                <li><a href="https://www.mcgill.ca/alumni/">The McGill alumni network</a></li>
                <li><a href="https://www.alumni.mcgill.ca/aoc/events-travel/registration/regwizEventsList.php?aoc=1">Attend an event</a></li>
                <li><a href="https://www.mcgill.ca/alumni/volunteer">Volunteer</a></li>
                <li><a href="https://www.mcgill.ca/alumni/benefits">Alumni benefits</a></li>
                <li><a href="https://giving.mcgill.ca/">Give back</a></li>
                <li><a href="https://mcgillnews.mcgill.ca/">McGill News alumni magazine</a></li>
                <li><a href="https://www.mcgill.ca/minerva/">Transcripts</a></li>
              </ul>
            </div>
          </div>
        </div>

        {/* Middle footer area with contact info and social links */}
        <div className="footer-top">
          <h2 className="visually-hidden">Department and University Information</h2>

          <div className="footer-info-grid">
            <div className="footer-info-column">
              <h4>In an emergency</h4>
              <ul className="footer-link-list">
                <li><a href="tel:514-398-3000">514-398-3000 (downtown campus)</a></li>
                <li><a href="tel:514-398-7777">514-398-7777 (Macdonald campus)</a></li>
              </ul>
            </div>

            <div className="footer-info-column">
              <h4>Visit</h4>
              <ul className="footer-link-list">
                <li><a href="https://maps.mcgill.ca/">Campus map</a></li>
                <li><a href="https://goo.gl/maps/ZUN8S2Ec4MU5jGNV9">845 Sherbrooke Street West, Montréal (Québec) H3A 0G4</a></li>
              </ul>
            </div>

            <div className="footer-info-column">
              <h4>Get in touch</h4>
              <ul className="footer-link-list">
                <li><a href="https://www.mcgill.ca/contact-us/">Contact us</a></li>
                <li><a href="https://ask.mcgill.ca/">AskMcGill</a></li>
                <li><a href="https://www.mcgill.ca/hireastudent/">Hire a student</a></li>
                <li><a href="https://www.mcgill.ca/newsroom/contacts">Media relations</a></li>
              </ul>
            </div>

            <div className="footer-info-column">
              <h4>Explore</h4>
              <ul className="footer-link-list">
                <li><a href="https://www.mcgill.ca/hr/careers">Careers</a></li>
                <li><a href="https://www.mcgill.ca/newsroom/">News</a></li>
                <li><a href="https://www.mcgill.ca/channels/events">Events</a></li>
              </ul>
            </div>
          </div>

          <div className="footer-follow">
            <div className="follow-links">
              <div className="follow-link-wrapper">
                <a href="https://www.facebook.com/McGillUniversity" className="follow-link" title="Follow McGill University on Facebook" aria-label="Follow McGill University on Facebook">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M13.5 21v-7h2.4l.4-3h-2.8V9.1c0-.9.2-1.6 1.6-1.6H16V4.8c-.3 0-.9-.1-1.8-.1-3 0-4.8 1.8-4.8 5V11H7v3h2.4v7h4.1Z" />
                  </svg>
                </a>
              </div>
              <div className="follow-link-wrapper">
                <a href="https://twitter.com/mcgillu" className="follow-link" title="Follow McGill University on X" aria-label="Follow McGill University on X">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M18.9 4H21l-4.6 5.2L22 20h-4.4l-3.5-4.9L9.8 20H7.7l4.9-5.6L2 4h4.5L9.7 8.6 13.8 4h2.1Zm-1.5 14.5H18L6.2 5.4h-.7l11.7 13.1Z" />
                  </svg>
                </a>
              </div>
              <div className="follow-link-wrapper">
                <a href="https://www.linkedin.com/school/mcgill-university/" className="follow-link" title="Follow McGill University on LinkedIn" aria-label="Follow McGill University on LinkedIn">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M6.4 8.5a1.9 1.9 0 1 1 0-3.8 1.9 1.9 0 0 1 0 3.8ZM4.8 19.3h3.3V9.9H4.8v9.4Zm5.1 0h3.2V14c0-1.4.3-2.7 2-2.7s1.7 1.6 1.7 2.8v5.2H20v-5.8c0-2.8-.6-5-3.9-5-1.6 0-2.6.9-3 1.7h-.1V9.9H9.9c0 .8 0 9.4 0 9.4Z" />
                  </svg>
                </a>
              </div>
              <div className="follow-link-wrapper">
                <a href="https://www.instagram.com/mcgillu/" className="follow-link" title="Follow McGill University on Instagram" aria-label="Follow McGill University on Instagram">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8.2a3.2 3.2 0 1 1 0-6.4 3.2 3.2 0 0 1 0 6.4Zm6.4-8.4a1.2 1.2 0 1 1-2.4 0 1.2 1.2 0 0 1 2.4 0ZM21 8c-.1-1.7-.5-3-1.7-4.2C18 2.6 16.7 2.1 15 2H9C7.3 2.1 6 2.6 4.8 3.8 3.6 5 3.1 6.3 3 8v8c.1 1.7.5 3 1.7 4.2C6 21.4 7.3 21.9 9 22h6c1.7-.1 3-.5 4.2-1.7 1.2-1.2 1.6-2.5 1.8-4.2V8Zm-2 7.9c0 1.3-.3 2-.7 2.4-.4.4-1.1.7-2.4.7H9c-1.3 0-2-.3-2.4-.7-.4-.4-.7-1.1-.7-2.4V8.1c0-1.3.3-2 .7-2.4C7 5.3 7.7 5 9 5h6.9c1.3 0 2 .3 2.4.7.4.4.7 1.1.7 2.4v7.8Z" />
                  </svg>
                </a>
              </div>
              <div className="follow-link-wrapper">
                <a href="https://www.youtube.com/mcgilluniversity" className="follow-link" title="Follow McGill University on YouTube" aria-label="Follow McGill University on YouTube">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M21.6 7.2a2.9 2.9 0 0 0-2-2C17.9 4.8 12 4.8 12 4.8s-5.9 0-7.6.4a2.9 2.9 0 0 0-2 2C2 8.9 2 12 2 12s0 3.1.4 4.8a2.9 2.9 0 0 0 2 2c1.7.4 7.6.4 7.6.4s5.9 0 7.6-.4a2.9 2.9 0 0 0 2-2c.4-1.7.4-4.8.4-4.8s0-3.1-.4-4.8ZM10 15.2V8.8l5.2 3.2-5.2 3.2Z" />
                  </svg>
                </a>
              </div>
              <div className="follow-link-wrapper">
                <a href="https://bsky.app/profile/mcgill.ca" className="follow-link" title="Follow McGill University on Bluesky" aria-label="Follow McGill University on Bluesky">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M12 11.1c1-1.9 3.8-5.4 6.3-7.1 1.8-1.2 2.4-.9 2.4.2 0 .8-.5 6.7-.8 7.7-.8 2.7-3.6 3.4-6.1 3l-.1.1c1 .2 3.8.8 4.4 4 .1.7-.4.9-1 .8-1-.2-3.6-1.5-5.1-4.4-1.6 2.9-4.2 4.2-5.1 4.4-.6.1-1.1-.1-1-.8.6-3.2 3.4-3.8 4.4-4l-.1-.1c-2.5.4-5.3-.3-6.1-3-.3-1-.8-6.9-.8-7.7 0-1.1.6-1.4 2.4-.2C8.2 5.7 11 9.2 12 11.1Z" />
                  </svg>
                </a>
              </div>
              <div className="follow-link-wrapper">
                <a href="https://www.threads.net/@mcgillu" className="follow-link" title="Follow McGill University on Threads" aria-label="Follow McGill University on Threads">
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path fill="currentColor" d="M14.5 10.2c-.2-2.2-1.6-3.4-4-3.4-2.6 0-4.2 1.6-4.2 4.1 0 2.4 1.5 4 4 4 1.9 0 3.2-.9 3.7-2.4.4.3.7.8.7 1.4 0 1.5-1.4 2.5-3.6 2.5-2.8 0-4.9-1.8-4.9-5.2 0-3.5 2.4-5.8 5.9-5.8 3.1 0 5.1 1.7 5.4 4.6.8.3 1.5.8 2 1.4 1.1 1.4 1.3 4 .2 5.8-1.2 1.8-3.6 2.9-6.4 2.9-4.7 0-7.8-3-7.8-7.6S8.4 4 13 4c4 0 6.6 2.1 7.1 5.7.5 0 1 .2 1.4.5.3.2.5.5.4.9 0 .4-.3.6-.7.6-.2 0-.3 0-.4-.1a3.5 3.5 0 0 0-1-.4c0 .6 0 1.1-.1 1.6-.5 3.3-3.2 5.5-7 5.5-3.1 0-5.3-1.7-5.3-4.4 0-2.6 2-4.3 5-4.3.9 0 1.7.1 2.4.4Zm-2.1 1.1c-1.7 0-2.8 1-2.8 2.4 0 1.5 1.1 2.5 2.9 2.5 2.1 0 3.6-1.1 4-3.1-.7-1.1-2.1-1.8-4.1-1.8Z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom footer bar with branding and policy links */}
        <div className="footer-sub">
          <div className="footer-sub-inner">
            <div className="footer-copyright">
              <div className="footer-brand-lockup">
                <img src={LGTMLogo2} alt="McGill logo" className="footer-logo-mark" />

              </div>
              <div>Copyright &copy; 2026 McGill University.</div>
            </div>

            <div className="footer-links">
              <ul className="footer-bottom-links">
                <li><a href="https://www.mcgill.ca/digital-accessibility-mcgill-university">Accessibility</a></li>
                <li><a href="https://www.mcgill.ca/privacy-notice">Privacy notice</a></li>
                <li><a href="https://www.mcgill.ca/cookie-notice">Cookie notice</a></li>
                <li><a href="https://www.mcgill.ca/contact-us/">Contact us</a></li>
              </ul>
            </div>

          </div>
        </div>
      </footer>
    </div>
  );
}
