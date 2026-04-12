//AMANDA TRAN

import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import logo from '../assets/logo1.png';
import Navbar from '../components/Navbar';
import calendarIcon from '../assets/calendarIcon.png';
import coursesIcon from '../assets/courseIcon.png';
import searchIcon from '../assets/searchIcon.png';
import InfoIcon from '../assets/infoIcon.png';
import { DeleteConfirmModal, SlotDetailModal } from '../components/Modals';
import Calendar from '../components/calendar/Calendar';
import {
  formatDate,
  formatTime,
  statusLabel,
  mapAppointmentToCalendarEvent,
  mapAvailabilityToCalendarEvent,
} from '../components/calendar/calendarUtils';
import { getHostingAppointments, cancelAppointment } from '../api/appointments';
import {
  createAvailability,
  deleteAvailability,
  getProfessorAvailabilities,
} from '../api/availabilities';
import { getHeatmaps } from '../api/heatmaps';
import CreateAvailabilityModal from '../components/CreateAvailabilityModal';

//replaced inline <aside> with reusable Sidebar component
import Sidebar from '../components/Sidebar'; 
import '../styles/Dashboard.css';

export default function ProfessorDashboard() {
  const navigate = useNavigate();
  const { userId } = useParams();

  // State
  // ─────────────────────────────────────────────────────────────
  const [appointments, setAppointments] = useState([]);
  const [availabilities, setAvailabilities] = useState([]);
  const [sideTab, setSideTab] = useState('calendar');
  const [modal, setModal] = useState(null);
  const [activeAppt, setActiveAppt] = useState(null);
  const [heatmaps, setHeatmaps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [rightPanelOpen, setRightPanelOpen] = useState(true);


  // Load professor-hosted appointments from backend
  // ─────────────────────────────────────────────────────────────
useEffect(() => {
  async function loadDashboardData() {
    try {
      setLoading(true);

      const [appointmentData, availabilityData] = await Promise.all([
        getHostingAppointments(userId),
        getProfessorAvailabilities(userId),
      ]);

      setAppointments(appointmentData.map(mapAppointmentToCalendarEvent));
      setAvailabilities(availabilityData);
      setError('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  loadDashboardData();
}, [userId]);

  useEffect(() => {
    let active = true;

    async function loadHeatmaps() {
      try {
        const data = await getHeatmaps({ created_by: userId });
        if (!active) return;
        setHeatmaps(data);
      } catch (err) {
        if (!active) return;
        setError((prev) => prev || err.message);
      }
    }

    loadHeatmaps();
    return () => {
      active = false;
    };
  }, [userId]);


  // Derive current user display info from loaded appointment data
  // Fallback to generic values if nothing is found yet
  // ─────────────────────────────────────────────────────────────
  const currentUser = useMemo(() => {
    for (const appt of appointments) {
      const me = appt.participants?.find((p) => Number(p.user_id) === Number(userId));
      if (me) {
        return {
          firstName: me.first_name || 'User',
          lastName: me.last_name || String(userId),
        };
      }
    }

    return {
      firstName: 'User',
      lastName: String(userId),
    };
  }, [appointments, userId]);


  // Get up to 5 upcoming non-cancelled appointments
  // ─────────────────────────────────────────────────────────────
  const calendarEvents = useMemo(() => {
    const myName = `${currentUser.firstName} ${currentUser.lastName}`;

    const appointmentRanges = appointments.map((appt) => ({
      start: new Date(appt.startTime).getTime(),
      end: new Date(appt.endTime).getTime(),
    }));

    const availabilityEvents = availabilities
      .filter((slot) => {
        const availabilityStart = new Date(slot.start_time).getTime();
        const availabilityEnd = new Date(slot.end_time).getTime();

        return !appointmentRanges.some(
          ({ start, end }) => availabilityStart < end && availabilityEnd > start
        );
      })
      .map((slot) => mapAvailabilityToCalendarEvent(slot, myName));

    return [...appointments, ...availabilityEvents];
  }, [appointments, availabilities, currentUser]);

  const upcomingAppts = useMemo(() => {
    const now = new Date();
    return appointments
      .filter((a) => new Date(a.startTime) >= now && a.status !== 'cancelled')
      .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
      .slice(0, 5);
  }, [appointments]);

  
  // Cancel appointment, create + delete availabilities
  // ─────────────────────────────────────────────────────────────
  async function handleDelete() {
    if (!activeAppt) return;

    try {
      if (activeAppt.type === 'availability') {
        await deleteAvailability(activeAppt.rawId, userId);

        setAvailabilities((prev) =>
          prev.filter(
            (slot) => Number(slot.availability_id) !== Number(activeAppt.rawId)
          )
        );
      } else {
        await cancelAppointment(activeAppt.id, userId);

        setAppointments((prev) =>
          prev.map((a) =>
            a.id === activeAppt.id
              ? { ...a, status: 'cancelled', color: '#777777' }
              : a
          )
        );
      }

      setActiveAppt(null);
      setModal(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleCreateAvailability(payload) {
    try {
      const result = await createAvailability({
        created_by: Number(userId),
        ...payload,
      });

      setAvailabilities((prev) => [...(result.availabilities || []), ...prev]);
      setModal(null);
      setError('');
    } catch (err) {
      setError(err.message);
    }
  }

 
  // Avatar initials
  // ─────────────────────────────────────────────────────────────
  const initials = `${currentUser.firstName?.[0] || 'U'}${currentUser.lastName?.[0] || ''}`;

  return (
    <>
      <div className="dashboard-page">
      
        {/* Top Navbar */}
        {/* ───────────────────────────────────────────────────── */}
        <Navbar
          logo={logo}
          title="Dashboard"
          onLeftClick={() => navigate('/')}
          user={{
            displayName: `${currentUser.lastName}, ${currentUser.firstName}`,
            role: 'professor',
            initials,
          }}
          actions={[
            { label: '+ New heatmap', onClick: () => navigate(`/heatmap/professor/new/${userId}`) },
            { label: rightPanelOpen ? 'Hide panel' : 'Show panel', onClick: () => setRightPanelOpen((open) => !open) },
            { label: 'Back to home', onClick: () => navigate('/') },
          ]}
        />

        <div className="dashboard-layout">
       
          {/* Sidebar                                           */}
          {/* [MODIFIED] replaced inline <aside> with the      */}
          {/* reusable <Sidebar> component.                    */}
          {/* 'create' uses iconText='+' (no image asset).     */}
          {/* ─────────────────────────────────────────────────── */}
          <Sidebar
            activeId={sideTab}
            items={[
              { id: 'calendar', icon: calendarIcon, label: 'Calendar', onClick: () => setSideTab('calendar') },
              { id: 'courses', icon: coursesIcon, label: 'Courses', onClick: () => setSideTab('courses') },
              { id: 'search', icon: searchIcon, label: 'Search', onClick: () => setSideTab('search') },
              { id: 'create', iconText: '+', label: 'Create availability', onClick: () => setModal('createAvailability') },
            ]}
            bottomItems={[
              { id: 'help', icon: InfoIcon, label: 'Help' },
            ]}
          />

         
          {/* Main dashboard content */}
          {/* ─────────────────────────────────────────────────── */}
          <div className="main-content">
            {/* Calendar area */}
            {loading && <p style={{ padding: 16 }}>Loading appointments...</p>}
            {error && <p style={{ padding: 16, color: 'red' }}>{error}</p>}

            {!loading && (
              <Calendar
                view="week"
                appointments={calendarEvents}
                onEventClick={(appt) => {
                  setActiveAppt(appt);
                  setModal('detail');
                }}
              />
            )}

           
            {/* Right panel */}
            {/* ─────────────────────────────────────────────── */}
            {rightPanelOpen && (
              <aside className="side-panel">
                {/* Upcoming appointments */}
              <div>
                <div className="side-panel-title">Upcoming appointments</div>
                {upcomingAppts.length === 0 ? (
                  <p style={{ fontSize: 12, color: '#aaa' }}>No upcoming appointments.</p>
                ) : (
                  upcomingAppts.map((appt) => {
                    const { label, cls } = statusLabel(appt.status);

                    return (
                      <div
                        key={appt.id}
                        className="appointment-item"
                        onClick={() => {
                          setActiveAppt(appt);
                          setModal('detail');
                        }}
                      >
                        <div className="appointment-color-dot" style={{ background: appt.color }} />
                        <div className="">
                          <h4>{appt.title || 'Untitled appointment'}</h4>
                          <h6>{appt.ownerName}</h6>
                          <p>{formatDate(appt.startTime)}</p>
                          <p>{appt.location}</p>
                        </div>
                        <span className={`appointment-status-pill ${cls}`}>{label}</span>
                      </div>
                    );
                  })
                )}
              </div>

              <div className="side-panel-divider" />

              {/* Heatmap tools */}
              <div>
                <div className="side-panel-title">Heatmap tools</div>
                <button
                  className="top-bar-button"
                  style={{
                    width: '100%',
                    padding: 10,
                    fontSize: 13,
                    borderRadius: 8,
                    marginBottom: 8,
                    textAlign: 'center',
                  }}
                  onClick={() => navigate(`/heatmap/professor/new/${userId}`)}
                >
                  + Create new heatmap
                </button>
                <p style={{ fontSize: 11, color: '#aaa', lineHeight: 1.6 }}>
                  Create a heatmap, share the link with students, and approve their
                  submissions from the heatmap page.
                </p>

                {/* REUSABLE SIDEBAR*/}
                <div style={{ marginTop: 12, display: 'grid', gap: 10 }}>
                  {heatmaps.length === 0 ? (
                    <p style={{ fontSize: 12, color: '#888', margin: 0 }}>No heatmaps created yet.</p>
                  ) : (
                    heatmaps.slice(0, 4).map((heatmap) => (
                      <div key={heatmap.id} className="invite-item">
                        <div className={`invite-dot${heatmap.pendingCount > 0 ? '' : ' responded'}`} />
                        <div className="">
                          <h4>{heatmap.title}</h4>
                          <p>
                            {heatmap.pendingCount} pending · {heatmap.submissionCount} submission{heatmap.submissionCount !== 1 ? 's' : ''}
                          </p>
                          <p style={{ color: '#888' }}>
                            Created {new Date(heatmap.createdAt).toLocaleDateString('en-CA', {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </p>
                        </div>
                        <button
                          className="invite-action-button"
                          onClick={() => navigate(`/heatmap/professor/${heatmap.id}/${userId}`)}
                          title="Open heatmap"
                        >
                          &gt;
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </aside>
          )}
          </div>
        </div>
      </div>

      {/* Create availability modal and appointment detail modal */}
      {/* ───────────────────────────────────────────────────── */}
      {modal === 'createAvailability' && (
        <CreateAvailabilityModal
          onClose={() => setModal(null)}
          onSubmit={handleCreateAvailability}
        />
      )}

      {modal === 'detail' && activeAppt && (
        <SlotDetailModal
          appointment={{
            title: activeAppt.title,
            day: new Date(activeAppt.startTime).toLocaleDateString('en-CA', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            }),
            time: `${formatTime(activeAppt.startTime)} – ${formatTime(activeAppt.endTime)}`,
            owner: activeAppt.ownerName,
            ownerEmail: activeAppt.ownerEmail,
            bookedBy: activeAppt.attendeeName,
            location: activeAppt.location,
            status: activeAppt.status,
          }}
          isOwner={true}
          onDelete={() => setModal('delete')}
          onClose={() => {
            setModal(null);
            setActiveAppt(null);
          }}
        />
      )}

    
      {/* Delete/cancel confirmation modal */}
      {/* ───────────────────────────────────────────────────── */}
      {modal === 'delete' && activeAppt && (
        <DeleteConfirmModal
          appointment={{
            title: activeAppt.title,
            day: new Date(activeAppt.startTime).toLocaleDateString(),
            time: formatTime(activeAppt.startTime),
            notifyEmail: activeAppt.ownerEmail,
          }}
          onConfirm={handleDelete}
          onClose={() => setModal('detail')}
        />
      )}
    </>
  );
}
