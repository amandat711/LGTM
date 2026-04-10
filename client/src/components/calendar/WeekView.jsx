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
  const today = useMemo(() => new Date(), []);
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
                  const compact = height < 44;
                  const startTimeString = new Date(appt.startTime).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                  });
                  const durationMinutes = (new Date(appt.endTime) - new Date(appt.startTime)) / 60000;
                  const shortEvent = durationMinutes <= 30;
                  const eventTop = top + 2;
                  const eventHeight = Math.max(height - 4, 24);

                  return (
                    <button
                      key={appt.id}
                      type="button"
                      className={`dash-event${compact ? ' compact' : ''}`}
                      style={{
                        top: eventTop,
                        height: eventHeight,
                        background: `${appt.color}33`,
                        border: `1px solid ${appt.color}33`,
                        borderLeft: `4px solid ${appt.color}`,
                        color: appt.color,
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                      }}
                      onClick={() => onEventClick(appt)}
                      title={`${appt.title} • ${startTimeString}`}
                    >
                      <div className={`dash-event-title-row${shortEvent ? ' short' : ''}`}>
                        <span className="dash-event-title">{appt.title}</span>
                        {shortEvent && (
                          <span className="dash-event-time-inline">{startTimeString}</span>
                        )}
                      </div>
                      {!shortEvent && (
                        <div className="dash-event-time">{startTimeString}</div>
                      )}
                      {!compact && appt.location && (
                        <div className="dash-event-location">{appt.location}</div>
                      )}
                    </button>
                  );
                })}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}