import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { getAvailableProfessors, getProfessorPublicAvailabilities } from '../api/availabilities';
import { createAppointment } from '../api/appointments';
import useAppShellSession from '../hooks/useAppShellSession';
import { resolvePath } from '../auth/authUtils';
import Navbar from '../components/Navbar';
import BookingCalendar, { toCalendarDateKey } from '../components/BookingCalendar';

function formatSlotTime(value) {
  return new Intl.DateTimeFormat('en-CA', {
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatSlotDate(value) {
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date(value));
}

function formatSelectedDate(dateKey) {
  return new Intl.DateTimeFormat('en-CA', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
  }).format(new Date(`${dateKey}T00:00:00`));
}

function getSlotDateKey(slot) {
  return toCalendarDateKey(new Date(slot.start_time));
}

function getSlotTitle(slot, professorName) {
  return slot?.av_title || `Meeting with ${professorName}`;
}

function groupSlotsByDate(slots) {
  return slots.reduce((groups, slot) => {
    const dateKey = getSlotDateKey(slot);
    if (!groups[dateKey]) groups[dateKey] = [];
    groups[dateKey].push(slot);
    return groups;
  }, {});
}

function professorMailtoHref(professor) {
  const subject = encodeURIComponent(`Booking — ${professor.name}`);
  return `mailto:${encodeURIComponent(professor.email)}?subject=${subject}`;
}

function mapOwnerToProfessor(owner) {
  return {
    id: owner.user_id?.toString() ?? `${owner.first_name?.toLowerCase()}.${owner.last_name?.toLowerCase()}`,
    name: owner.first_name && owner.last_name ? `Prof. ${owner.first_name} ${owner.last_name}` : owner.staff_title || 'Professor',
    department: owner.department || owner.staff_title || 'Faculty',
    email: owner.mcgill_email || 'noreply@mail.mcgill.ca',
    bio: owner.staff_title
      ? `Available for meetings in ${owner.department || 'your area of study'}.`
      : 'Available for appointments.',
  };
}

export default function BookingProfessor() {
  const navigate = useNavigate();
  const { professorId } = useParams();
  const { user, userId: bookerId } = useAppShellSession();

  const [professor, setProfessor] = useState(null);
  const [slots, setSlots] = useState([]);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDate, setSelectedDate] = useState(toCalendarDateKey(new Date()));
  const [calendarMonth, setCalendarMonth] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  useEffect(() => {
    //TODO: this works but is not efficient, we should make an API call to get the professor by id instead of getting all professors and then filtering
    async function loadProfessor() {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const owners = await getAvailableProfessors('');
        const mapped = Array.isArray(owners) ? owners.map(mapOwnerToProfessor) : [];
        const found = mapped.find((prof) => prof.id === professorId);

        setProfessor(found || null);
        if (!found) {
          setError('Professor not found.');
        }
      } catch (err) {
        setProfessor(null);
        setError('Unable to load professor information from backend.');
      }
    }

    loadProfessor();
  }, [professorId]);

  useEffect(() => {
    let active = true;

    async function loadSlots() {
      setLoading(true);
      setError('');
      setMessage('');

      try {
        const data = await getProfessorPublicAvailabilities(professorId);
        if (!active) return;

        const upcoming = Array.isArray(data)
          ? data.filter((slot) => new Date(slot.end_time) > new Date())
            .sort((first, second) => new Date(first.start_time) - new Date(second.start_time))
          : [];

        setSlots(upcoming);
      } catch (err) {
        if (!active) return;
        setSlots([]);
        setError('Unable to load availability slots from backend.');
      } finally {
        if (active) setLoading(false);
      }
    }

    loadSlots();
    return () => {
      active = false;
    };
  }, [professorId]);

  const groupedSlots = useMemo(() => groupSlotsByDate(slots), [slots]);
  const availableDateSet = useMemo(() => new Set(Object.keys(groupedSlots)), [groupedSlots]);
  const selectedDaySlots = groupedSlots[selectedDate] || [];

  useEffect(() => {
    if (slots.length === 0) return;

    const firstAvailableDate = getSlotDateKey(slots[0]);
    setSelectedDate((currentDate) => (
      groupedSlots[currentDate] ? currentDate : firstAvailableDate
    ));
    setCalendarMonth((currentMonth) => {
      const currentMonthKey = `${currentMonth.getFullYear()}-${currentMonth.getMonth()}`;
      const firstDate = new Date(`${firstAvailableDate}T00:00:00`);
      const firstMonthKey = `${firstDate.getFullYear()}-${firstDate.getMonth()}`;

      return currentMonthKey === firstMonthKey
        ? currentMonth
        : new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
    });
  }, [groupedSlots, slots]);

  function moveCalendarMonth(offset) {
    setCalendarMonth((currentMonth) => (
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + offset, 1)
    ));
  }

  function handleDateSelect(dateKey) {
    setSelectedDate(dateKey);
    if (selectedSlot && getSlotDateKey(selectedSlot) !== dateKey) {
      setSelectedSlot(null);
    }
  }

  const handleConfirm = async () => {
    if (!selectedSlot) return;
    setStatus('submitting');
    setMessage('');
    setError('');


    try {
      await createAppointment(selectedSlot.availability_id, bookerId);
      setStatus('success');
      setMessage('Your booking is confirmed! It will appear on your dashboard shortly.');
    } catch (err) {
      setStatus('error');
      setError(err.message || 'Unable to confirm booking.');
    }
  };

  if (loading && !professor) {
    return (
      <div className="dash-root">
        <nav className="dash-nav">
          <div className="dash-nav-left">
            <button
              type="button"
              onClick={() => navigate(-1)}
              style={{
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
              }}
            >
              Back
            </button>
          </div>
        </nav>
        <div className="booking-page-content">
          <p>Loading…</p>
        </div>
      </div>
    );
  }

  if (!professor) {
    return (
      <div className="dashboard-page">
        <Navbar title="Back" onLeftClick={() => navigate(-1)} />
        <div className="booking-page">
          <p>Professor not found.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-page">
      <Navbar
        title="Back to search"
        onLeftClick={() => navigate(-1)}
        user={{ displayName: professor.name, role: 'student', badgeText: 'Student booking' }}
      />

      <div className="booking-page">
        <section className="booking-box booking-flow-box">
          <div className="booking-header">
            <div>
              <h1>{professor.name}</h1>
              <p className="professor-card-subtitle">{professor.department}</p>
              <p className="professor-card-description">{professor.bio}</p>
              <div className="booking-professor-email-row">
                <p className="professor-card-email">{professor.email}</p>
                <a
                  href={professorMailtoHref(professor)}
                  className="professor-card-button secondary-button booking-professor-email-btn"
                >
                  Email professor
                </a>
              </div>
            </div>
            {/* <div className="booking-info-pill">Student ID {studentId}</div> */}
          </div>

          {message && <div className="booking-status-message success">{message}</div>}
          {error && <div className="booking-status-message error">{error}</div>}

          <div className="booking-layout">
            <BookingCalendar
              monthDate={calendarMonth}
              selectedDate={selectedDate}
              availableDates={availableDateSet}
              onSelectDate={handleDateSelect}
              onMonthChange={moveCalendarMonth}
            />

            <div className="available-slots-panel">
              <div className="booking-section-title">{formatSelectedDate(selectedDate)}</div>
              {loading ? (
                <p className="booking-empty-message">Loading available times...</p>
              ) : slots.length === 0 ? (
                <p className="booking-empty-message">No slots are currently available.</p>
              ) : selectedDaySlots.length === 0 ? (
                <p className="booking-empty-message">No available slots for this date. Pick a highlighted date on the calendar.</p>
              ) : (
                <div className="booking-day-block">
                  {selectedDaySlots.map((slot) => {
                    const isFull = slot.booked_count >= slot.capacity;
                    const isSelected = selectedSlot?.availability_id === slot.availability_id;

                    return (
                      <button
                        key={slot.availability_id}
                        className={`available-slot-card${isSelected ? ' selected' : ''}${isFull ? ' disabled' : ''}`}
                        disabled={isFull}
                        onClick={() => setSelectedSlot(slot)}
                      >
                        <div>
                          <strong>{formatSlotTime(slot.start_time)} – {formatSlotTime(slot.end_time)}</strong>
                          <p className="available-slot-title">{getSlotTitle(slot, professor.name)}</p>
                          <p className="available-slot-location">{slot.location || 'Online'}</p>
                        </div>
                        <span className={`available-slot-status${isFull ? ' full' : ''}`}>
                          {isFull ? 'Full' : 'Open'}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <aside className="selected-slot-panel">
              <h2>Selected slot</h2>
              {selectedSlot ? (
                <div className="selected-slot-card">
                  <p className="selected-slot-title">{getSlotTitle(selectedSlot, professor.name)}</p>
                  <p className="selected-slot-date">{formatSlotDate(selectedSlot.start_time)}</p>
                  <h3>{formatSlotTime(selectedSlot.start_time)} – {formatSlotTime(selectedSlot.end_time)}</h3>
                  <p className="available-slot-location">{selectedSlot.location || 'Online meeting'}</p>
                  <div className="slot-detail-row">
                    <span>Capacity</span>
                    <span>{selectedSlot.capacity}</span>
                  </div>
                  <div className="slot-detail-row">
                    <span>Booked</span>
                    <span>{selectedSlot.booked_count}/{selectedSlot.capacity}</span>
                  </div>
                </div>
              ) : (
                <p className="booking-empty-message">Select a slot to see details and confirm your booking.</p>
              )}

              <button
                className="professor-card-button"
                disabled={!selectedSlot || status === 'submitting'}
                onClick={handleConfirm}
              >
                Confirm booking
              </button>
              <button
                className="professor-card-button secondary-button"
                onClick={() => navigate(resolvePath('dashboard', user))}
              >
                Back to dashboard
              </button>
            </aside>
          </div>
        </section>
      </div>
    </div>
  );
}
