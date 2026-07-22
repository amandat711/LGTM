// JOCELYNE LI (100% estimated contribution) => Dashboard/navigation consistency and UI polish
import React from 'react';
import { formatDate, statusLabel, includeAppointmentOnWeekCalendar } from '../calendar/calendarUtils';

export default function UpcomingAppointments({ appointments, onAppointmentClick }) {
  const today = new Date();

  const upcomingAppts = appointments
    .filter((a) => includeAppointmentOnWeekCalendar(a) && new Date(a.startTime) >= today)
    .sort((a, b) => new Date(a.startTime) - new Date(b.startTime))
    .slice(0, 5);

  return (
    <div>
      <div className="dash-panel-section-title">Upcoming appointments</div>

      {upcomingAppts.length === 0 ? (
        <p style={{ fontSize: 12, color: '#aaa' }}>No upcoming appointments.</p>
      ) : (
        upcomingAppts.map((appt) => {
          const { label, cls } = statusLabel(appt.status);

          return (
            <div
              key={appt.id}
              className="dash-appt-card"
              onClick={() => onAppointmentClick(appt)}
            >
              <div className="dash-appt-dot" style={{ background: appt.color }} />
              <div className="dash-appt-info">
                <h4>{appt.ownerName}</h4>
                <p>{formatDate(appt.startTime)}</p>
                <p>{appt.location}</p>
              </div>
              <span className={`dash-appt-status ${cls}`}>{label}</span>
            </div>
          );
        })
      )}
    </div>
  );
}