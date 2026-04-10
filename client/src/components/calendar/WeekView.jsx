import React, { useMemo, useState } from 'react';
import {
  DAYS_SHORT,
  MONTHS,
  HOURS,
  isSameDay,
  getEventStyle,
} from './calendarUtils';

export default function WeekView({ appointments, onEventClick }) {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);

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

  return (
    <div className="dash-calendar-panel">
      <div className="dash-cal-header">
        <span className="dash-cal-title">
          {MONTHS[today.getMonth()]} {today.getFullYear()}
        </span>

        <div className="dash-cal-nav">
          <button
            className="dash-cal-nav-btn"
            onClick={() => setWeekOffset(0)}
            style={{ width: 'auto', padding: '0 10px', fontSize: 12, fontWeight: 500 }}
          >
            Today
          </button>
          <button className="dash-cal-nav-btn" onClick={() => setWeekOffset((w) => w - 1)}>
            ‹
          </button>
          <span className="dash-cal-range">{weekLabel}</span>
          <button className="dash-cal-nav-btn" onClick={() => setWeekOffset((w) => w + 1)}>
            ›
          </button>
        </div>
      </div>

      <div className="dash-week-grid">
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

        <div className="dash-time-rows">
          <div>
            {HOURS.map((h) => (
              <div key={h} className="dash-time-label">
                {h <= 12 ? h : h - 12}
                {h < 12 ? 'am' : 'pm'}
              </div>
            ))}
          </div>

          {weekDays.map((day, di) => (
            <div key={di} style={{ position: 'relative' }}>
              {HOURS.map((h) => (
                <div key={h} className="dash-time-cell" />
              ))}

              {appointments
                .filter((a) => isSameDay(new Date(a.startTime), day))
                .map((appt) => {
                  const { top, height } = getEventStyle(appt);

                  return (
                    <div
                      key={appt.id}
                      className="dash-event"
                      style={{
                        top,
                        height,
                        background: `${appt.color}22`,
                        borderLeft: `3px solid ${appt.color}`,
                        color: appt.color,
                      }}
                      onClick={() => onEventClick(appt)}
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
  );
}