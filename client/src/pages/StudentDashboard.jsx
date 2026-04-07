import calendarIcon from '../assets/calendarIcon.png';
import coursesIcon  from '../assets/courseIcon.png';
import searchIcon   from '../assets/searchIcon.png';
import InfoIcon   from '../assets/infoIcon.png';
import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import logo from '../assets/logo1.png';
import { DeleteConfirmModal, SlotDetailModal } from '../components/Modals';
import '../styles/Dashboard.css';

// ─── Hardcoded user (replace with real auth later) ────────────
const USER = { firstName: 'Amanda', lastName: 'Tran', role: 'student' };

// ─── Sample data ──────────────────────────────────────────────
const SAMPLE_APPOINTMENTS = [
  {
    id: 1,
    title: 'Office Hours',
    ownerName: 'Prof. Vybihal',
    ownerEmail: 'joseph.vybihal@mcgill.ca',
    startTime: new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 9 * 3600000).toISOString(),
    endTime:   new Date(Date.now() + 1 * 24 * 60 * 60 * 1000 + 10 * 3600000).toISOString(),
    location: 'ONLINE/ENGMC321',
    status: 'confirmed',
    color: '#E31429',
  },
  {
    id: 2,
    title: 'TA Session',
    ownerName: 'TA Chen',
    ownerEmail: 'ta.chen@mcgill.ca',
    startTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 14 * 3600000).toISOString(),
    endTime:   new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 15 * 3600000 + 1800000).toISOString(),
    location: 'ONLINE/ENGMC321',
    status: 'pending',
    color: '#c0842a',
  },
  {
    id: 3,
    title: 'Project Check-in',
    ownerName: 'Prof. Vybihal',
    ownerEmail: 'joseph.vybihal@mcgill.ca',
    startTime: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 11 * 3600000).toISOString(),
    endTime:   new Date(Date.now() + 5 * 24 * 60 * 60 * 1000 + 12 * 3600000).toISOString(),
    location: 'MC 321',
    status: 'waiting_approval',
    color: '#1565a8',
  },
];

const SAMPLE_INVITES = [
  {
    id: 1,
    token: '1',
    title: 'Office Hours — Prof. Vybihal',
    profName: 'Prof. Vybihal',
    dueDate: new Date(Date.now() + 4 * 24 * 60 * 60 * 1000).toISOString(),
    responded: false,
  },
  {
    id: 2,
    token: '2',
    title: 'COMP 307 Project Meeting',
    profName: 'Prof. Vybihal',
    dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    responded: true,
  },
];

// ─── Helpers ──────────────────────────────────────────────────
const DAYS_SHORT = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
const MONTHS     = ['January','February','March','April','May','June',
                    'July','August','September','October','November','December'];
const HOURS      = Array.from({ length: 15 }, (_, i) => i + 7);

function formatTime(iso) {
  const d = new Date(iso);
  const h = d.getHours(), m = d.getMinutes();
  const ampm = h < 12 ? 'AM' : 'PM';
  return `${h % 12 || 12}:${m.toString().padStart(2,'0')} ${ampm}`;
}

function formatDate(iso) {
  const d = new Date(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()} @ ${formatTime(iso)}`;
}

function isSameDay(d1, d2) {
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth()    === d2.getMonth()    &&
         d1.getDate()     === d2.getDate();
}

function statusLabel(s) {
  if (s === 'confirmed')        return { label: 'Confirmed', cls: 'status-confirmed' };
  if (s === 'pending')          return { label: 'Pending',   cls: 'status-pending' };
  if (s === 'waiting_approval') return { label: 'Waiting',   cls: 'status-waiting' };
  if (s === 'cancelled')        return { label: 'Cancelled', cls: 'status-cancelled' };
  return { label: s, cls: '' };
}

  const today    = new Date();
// ─────────────────────────────────────────────────────────────
export default function StudentDashboard() {
  const navigate = useNavigate();

  const [appointments, setAppointments] = useState(SAMPLE_APPOINTMENTS);
  const [sideTab,      setSideTab]      = useState('calendar');
  const [weekOffset,   setWeekOffset]   = useState(0);
  const [modal,        setModal]        = useState(null);
  const [activeAppt,   setActiveAppt]   = useState(null);


  const initials = `${USER.firstName[0]}${USER.lastName[0]}`;

  const weekDays = useMemo(() => {
    const sunday = new Date(today);
    sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [weekOffset]);

  const weekLabel = `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${MONTHS[weekDays[6].getMonth()]} ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`;

  const upcomingAppts = appointments
    .filter(a => new Date(a.startTime) >= today && a.status !== 'cancelled')
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 5);

  function getEventStyle(appt) {
    const start  = new Date(appt.startTime);
    const end    = new Date(appt.endTime);
    const top    = ((start.getHours() - 7) * 60 + start.getMinutes()) * (48 / 60);
    const height = Math.max(((end - start) / 60000) * (48 / 60), 20);
    return { top, height };
  }

  function handleDelete() {
    setAppointments(prev => prev.filter(a => a.id !== activeAppt.id));
    setActiveAppt(null);
    setModal(null);
  }

  return (
    <div className="dash-root">

      {/* ── Navbar ──────────────────────────────────────── */}
      <nav className="dash-nav">
        <div className="dash-nav-left">
           <button onClick={() => navigate('/')} style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', display: 'flex', alignItems: 'center' }}>
            <img src={logo} alt="LGTM" className="dash-nav-logo" style={{ height: '100px', width: '100px', objectFit: 'contain' }}/>
           </button>
          <span className="dash-nav-title">Dashboard</span>
        </div>
        <div className="dash-nav-right">
          <span className="dash-nav-name">{USER.lastName}, {USER.firstName}</span>
          <span className="dash-nav-role student">Student</span>
          <div className="dash-nav-avatar">{initials}</div>
          
        </div>
      </nav>

      <div className="dash-body">

        {/* ── Sidebar ─────────────────────────────────── */}
        <aside className="dash-sidebar">
          {[
            { id: 'calendar', icon: calendarIcon, label: 'Calendar' },
            { id: 'courses',  icon: coursesIcon,  label: 'Courses'  },
            { id: 'search',   icon: searchIcon,   label: 'Search'   },
          ].map(item => (
            <button
              key={item.id}
              className={`dash-sidebar-btn${sideTab === item.id ? ' active' : ''}`}
              onClick={() => setSideTab(item.id)}>
              <img src={item.icon} alt={item.label} style={{ width: 40, height: 40, objectFit: 'contain' }} />
              <span className="dash-sidebar-label">{item.label}</span>
            </button>
          ))}
          <div className="dash-sidebar-spacer" />
          <button className="dash-sidebar-btn">
            <img src={InfoIcon} alt="Help" style={{ width: 40, height: 40, objectFit: 'contain' }} />

            {/* DONT NEED THIS! <span className="dash-sidebar-label">Help</span>*/}
          </button>
        </aside>

        <div className="dash-main">

          {/* ── Calendar ──────────────────────────────── */}
          <div className="dash-calendar-panel">
            <div className="dash-cal-header">
              <span className="dash-cal-title">
                {MONTHS[today.getMonth()]} {today.getFullYear()}
              </span>
              <div className="dash-cal-nav">
                <button className="dash-cal-nav-btn" onClick={() => setWeekOffset(0)}
                  style={{ width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 500 }}>
                  Today
                </button>
                <button className="dash-cal-nav-btn" onClick={() => setWeekOffset(w => w - 1)}>‹</button>
                <span className="dash-cal-range">{weekLabel}</span>
                <button className="dash-cal-nav-btn" onClick={() => setWeekOffset(w => w + 1)}>›</button>
              </div>
            </div>

            <div className="dash-week-grid">
              {/* Day headers */}
              <div className="dash-week-days">
                <div className="dash-week-day-header" />
                {weekDays.map((d, i) => (
                  <div key={i} className="dash-week-day-header">
                    <div className="dash-day-name">{DAYS_SHORT[d.getDay()]}</div>
                    <div className={`dash-day-num${isSameDay(d, today) ? ' today' : ''}`}>
                      {d.getDate()}
                    </div>
                  </div>
                ))}
              </div>

              {/* Time rows */}
              <div className="dash-time-rows">
                <div>
                  {HOURS.map(h => (
                    <div key={h} className="dash-time-label">
                      {h <= 12 ? h : h - 12}{h < 12 ? 'am' : 'pm'}
                    </div>
                  ))}
                </div>
                {weekDays.map((day, di) => (
                  <div key={di} style={{ position: 'relative' }}>
                    {HOURS.map(h => <div key={h} className="dash-time-cell" />)}
                    {appointments
                      .filter(a => isSameDay(new Date(a.startTime), day))
                      .map(appt => {
                        const { top, height } = getEventStyle(appt);
                        return (
                          <div
                            key={appt.id}
                            className="dash-event"
                            style={{
                              top, height,
                              background: appt.color + '22',
                              borderLeft: `3px solid ${appt.color}`,
                              color: appt.color,
                            }}
                            onClick={() => { setActiveAppt(appt); setModal('detail'); }}
                          >
                            {appt.title}
                          </div>
                        );
                      })}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Right panel ─────────────────────────── */}
          <aside className="dash-right-panel">
            <div>
              <div className="dash-panel-section-title">Upcoming appointments</div>
              {upcomingAppts.length === 0
                ? <p style={{ fontSize: 12, color: '#aaa' }}>No upcoming appointments.</p>
                : upcomingAppts.map(appt => {
                    const { label, cls } = statusLabel(appt.status);
                    return (
                      <div key={appt.id} className="dash-appt-card"
                        onClick={() => { setActiveAppt(appt); setModal('detail'); }}>
                        <div className="dash-appt-dot" style={{ background: appt.color }} />
                        <div className="dash-appt-info">
                          <h4>{appt.ownerName}</h4>
                          <p>{formatDate(appt.startTime)}</p>
                          <p>{appt.location}</p>
                        </div>
                        <span className={`dash-appt-status ${cls}`}>{label}</span>
                      </div>
                    );
                  })}
            </div>

            <div className="dash-divider" />

            <div>
              <div className="dash-panel-section-title">Heatmap invitations</div>
              {SAMPLE_INVITES.map(inv => (
                <div key={inv.id} className="dash-invite-card">
                  <div className={`dash-invite-dot${inv.responded ? ' responded' : ''}`} />
                  <div className="dash-invite-info">
                    <h4>{inv.profName}</h4>
                    <p>{inv.title}</p>
                    <p style={{ color: inv.responded ? '#888' : '#E31429' }}>
                      {inv.responded
                        ? 'Responded'
                        : `Due ${new Date(inv.dueDate).toLocaleDateString('en-CA', { month: 'short', day: 'numeric' })}`}
                    </p>
                  </div>
                  {!inv.responded && (
                    <button
                      className="dash-invite-open"
                      onClick={() => navigate(`/heatmap/${inv.token}`)}
                    >
                      +
                    </button>
                  )}
                </div>
              ))}
            </div>
          </aside>
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────── */}
      {modal === 'detail' && activeAppt && (
        <SlotDetailModal
          appointment={{
            title:      activeAppt.title,
            day:        new Date(activeAppt.startTime).toLocaleDateString('en-CA', { weekday: 'long', month: 'long', day: 'numeric' }),
            time:       `${formatTime(activeAppt.startTime)} – ${formatTime(activeAppt.endTime)}`,
            owner:      activeAppt.ownerName,
            ownerEmail: activeAppt.ownerEmail,
            location:   activeAppt.location,
            status:     activeAppt.status,
          }}
          isOwner={false}
          onDelete={() => setModal('delete')}
          onClose={() => { setModal(null); setActiveAppt(null); }}
        />
      )}

      {modal === 'delete' && activeAppt && (
        <DeleteConfirmModal
          appointment={{
            title:       activeAppt.title,
            day:         new Date(activeAppt.startTime).toLocaleDateString(),
            time:        formatTime(activeAppt.startTime),
            notifyEmail: activeAppt.ownerEmail,
          }}
          onConfirm={handleDelete}
          onClose={() => setModal('detail')}
        />
      )}
    </div>
  );
}
