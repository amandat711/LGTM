import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DAYS_SHORT,
  MONTHS,
  HOURS,
  isSameDay,
  getEventStyle,
  CALENDAR_START_HOUR,
} from './calendarUtils';

export default function WeekView({ appointments, onEventClick }) {
  const today = new Date();
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef(null);

  const slotHeight = 64;

  const weekDays = useMemo(() => {
    const sunday = new Date(today);
    sunday.setHours(0, 0, 0, 0);
    sunday.setDate(today.getDate() - today.getDay() + weekOffset * 7);

    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(sunday);
      d.setDate(sunday.getDate() + i);
      return d;
    });
  }, [today, weekOffset]);

  const titleMonth = MONTHS[weekDays[0].getMonth()];
  const titleYear = weekDays[0].getFullYear();

  const weekLabel = `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${
    MONTHS[weekDays[6].getMonth()]
  } ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`;

  useEffect(() => {
    if (!scrollRef.current) return;

    const preferredHour = 8;
    const top = Math.max((preferredHour - CALENDAR_START_HOUR) * slotHeight - 20, 0);
    scrollRef.current.scrollTop = top;
  }, []);

  return (
    <div className="dash-calendar-panel">
      <div className="dash-cal-header">
        <span className="dash-cal-title">
          {titleMonth} {titleYear}
        </span>

        <div className="dash-cal-nav">
          <button
            className="dash-cal-today-btn"
            onClick={() => setWeekOffset(0)}
          >
            Today
          </button>

          <button
            className="dash-cal-nav-btn"
            onClick={() => setWeekOffset((w) => w - 1)}
          >
            ‹
          </button>

          <span className="dash-cal-range">{weekLabel}</span>

          <button
            className="dash-cal-nav-btn"
            onClick={() => setWeekOffset((w) => w + 1)}
          >
            ›
          </button>
        </div>
      </div>

      <div className="dash-week-grid" ref={scrollRef}>
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

        <div
          className="dash-time-rows"
          style={{ '--slot-height': `${slotHeight}px` }}
        >
          <div>
            {HOURS.map((h) => (
              <div key={h} className="dash-time-label">
                {h % 12 || 12}
                {h < 12 ? 'am' : 'pm'}
              </div>
            ))}
          </div>

          {weekDays.map((day, di) => (
            <div key={di} className="dash-day-column">
              {HOURS.map((h) => (
                <div key={h} className="dash-time-cell" />
              ))}

              {appointments
                .filter((a) => isSameDay(new Date(a.startTime), day))
                .map((appt) => {
                  const { top, height } = getEventStyle(appt, slotHeight);

                  return (
                    <div
                      key={appt.id}
                      className="dash-event"
                      style={{
                        top,
                        height,
                        background: `${appt.color}18`,
                        borderLeft: `3px solid ${appt.color}`,
                        color: appt.color,
                      }}
                      onClick={() => onEventClick(appt)}
                    >
                      <div className="dash-event-title">{appt.title}</div>
                      <div className="dash-event-time">
                        {new Date(appt.startTime).toLocaleTimeString([], {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </div>
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