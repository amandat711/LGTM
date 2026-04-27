// SHIRLEY DING
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  DAYS_SHORT,
  MONTHS,
  HOURS,
  isSameDay,
  getEventStyle,
  getCalendarTimeZone,
  getCalendarTimeZoneLabel,
  CALENDAR_START_HOUR,
  CALENDAR_END_HOUR,
} from './calendarUtils';

const MINUTES_STEP = 15;

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function minutesToTimeLabel(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  const ampm = hours < 12 ? 'am' : 'pm';
  const displayH = hours % 12 || 12;
  return `${displayH}:${String(minutes).padStart(2, '0')}${ampm}`;
}

function buildDayEventLayouts(dayAppointments) {
  const sorted = [...dayAppointments]
    .map((appt) => ({
      appt,
      startMs: new Date(appt.startTime).getTime(),
      endMs: new Date(appt.endTime).getTime(),
      lane: 0,
      lanesInCluster: 1,
    }))
    .sort((a, b) => (a.startMs - b.startMs) || (a.endMs - b.endMs));

  const clusters = [];
  let currentCluster = null;
  for (const item of sorted) {
    if (!currentCluster || item.startMs >= currentCluster.endMs) {
      currentCluster = { endMs: item.endMs, items: [item] };
      clusters.push(currentCluster);
    } else {
      currentCluster.endMs = Math.max(currentCluster.endMs, item.endMs);
      currentCluster.items.push(item);
    }
  }

  const out = new Map();
  for (const cluster of clusters) {
    const laneEnds = [];
    for (const item of cluster.items) {
      let lane = laneEnds.findIndex((laneEnd) => laneEnd <= item.startMs);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(item.endMs);
      } else {
        laneEnds[lane] = item.endMs;
      }
      item.lane = lane;
    }
    const lanesInCluster = Math.max(laneEnds.length, 1);
    for (const item of cluster.items) {
      item.lanesInCluster = lanesInCluster;
      out.set(item.appt.id, item);
    }
  }

  return out;
}

export default function WeekView({ appointments, onEventClick, onSlotClick, onSlotSelect }) {
  const today = useMemo(() => new Date(), []);
  const [now, setNow] = useState(() => new Date());
  const [weekOffset, setWeekOffset] = useState(0);
  const scrollRef = useRef(null);

  // Height of one hour row (keeps existing layout). 15-min rows are quarter height.
  const hourHeight = 64;
  const stepHeight = hourHeight / (60 / MINUTES_STEP);
  const totalMinutesInDay = (CALENDAR_END_HOUR - CALENDAR_START_HOUR + 1) * 60;
  const maxSelectableMinutes = totalMinutesInDay - MINUTES_STEP;

  const [drag, setDrag] = useState(null);
  const dragRef = useRef(null);

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
  const calendarTimeZone = useMemo(() => getCalendarTimeZone(), []);
  const calendarTimeZoneLabel = useMemo(() => getCalendarTimeZoneLabel(), []);

  const weekLabel = `${MONTHS[weekDays[0].getMonth()]} ${weekDays[0].getDate()} – ${
    MONTHS[weekDays[6].getMonth()]
  } ${weekDays[6].getDate()}, ${weekDays[6].getFullYear()}`;

  useEffect(() => {
    if (!scrollRef.current) return;

    const preferredHour = 8;
    const top = Math.max((preferredHour - CALENDAR_START_HOUR) * hourHeight - 20, 0);
    scrollRef.current.scrollTop = top;
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setNow(new Date());
    }, 30000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    function handleMove(e) {
      if (!dragRef.current) return;
      const { day, columnEl, startMinutes } = dragRef.current;
      if (!columnEl) return;

      const rect = columnEl.getBoundingClientRect();
      const y = clamp(e.clientY - rect.top, 0, rect.height - 1);
      const minutes = clamp(Math.floor(y / stepHeight) * MINUTES_STEP, 0, maxSelectableMinutes);
      const endMinutes = minutes;

      const next = { day, startMinutes, endMinutes };
      dragRef.current = { ...dragRef.current, endMinutes };
      setDrag(next);
    }

    function handleUp() {
      if (!dragRef.current) return;

      const { dayDate, startMinutes, endMinutes } = dragRef.current;
      dragRef.current = null;

      const startMin = Math.min(startMinutes, endMinutes);
      const endMin = Math.max(startMinutes, endMinutes) + MINUTES_STEP;

      const start = new Date(dayDate);
      start.setHours(CALENDAR_START_HOUR, 0, 0, 0);
      start.setMinutes(start.getMinutes() + startMin);

      const end = new Date(dayDate);
      end.setHours(CALENDAR_START_HOUR, 0, 0, 0);
      end.setMinutes(end.getMinutes() + endMin);

      setDrag(null);

      if (onSlotSelect) {
        onSlotSelect({ startIso: start.toISOString(), endIso: end.toISOString() });
      } else if (onSlotClick) {
        onSlotClick(start.toISOString());
      }
    }

    window.addEventListener('mousemove', handleMove);
    window.addEventListener('mouseup', handleUp);
    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
    };
  }, [hourHeight, maxSelectableMinutes, onSlotClick, onSlotSelect, stepHeight]);

  const nowDayIndex = useMemo(
    () => weekDays.findIndex((d) => isSameDay(d, now)),
    [weekDays, now]
  );
  const nowMinutesFromCalendarStart = (now.getHours() - CALENDAR_START_HOUR) * 60 + now.getMinutes();
  const showNowLine =
    nowDayIndex >= 0 &&
    nowMinutesFromCalendarStart >= 0 &&
    nowMinutesFromCalendarStart <= totalMinutesInDay;
  const nowLineTop = (nowMinutesFromCalendarStart / 60) * hourHeight;

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
          <div className="dash-week-day-header dash-week-timezone-cell">
            <span className="dash-cal-timezone">{calendarTimeZoneLabel}</span>
          </div>
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
          style={{ '--slot-height': `${hourHeight}px` }}
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
              {(() => {
                const dayAppointments = appointments.filter((a) => isSameDay(new Date(a.startTime), day));
                const layoutById = buildDayEventLayouts(dayAppointments);
                return (
                  <>
              {/* Grid background lines (hour blocks). Actual selection is drag-based at 15-min granularity. */}
              {HOURS.map((h) => (
                <div key={h} className="dash-time-cell" />
              ))}

              {/* Drag capture layer */}
              <div
                className="dash-slot-layer"
                role="presentation"
                onMouseDown={(e) => {
                  if (!onSlotSelect && !onSlotClick) return;
                  // Only left-click starts a drag.
                  if (e.button !== 0) return;

                  const columnEl = e.currentTarget;
                  const rect = columnEl.getBoundingClientRect();
                  const y = clamp(e.clientY - rect.top, 0, rect.height - 1);
                  const minutes = clamp(Math.floor(y / stepHeight) * MINUTES_STEP, 0, maxSelectableMinutes);

                  const dayDate = new Date(day);
                  dayDate.setHours(0, 0, 0, 0);

                  dragRef.current = {
                    day: di,
                    dayDate,
                    columnEl,
                    startMinutes: minutes,
                    endMinutes: minutes,
                  };
                  setDrag({ day: di, startMinutes: minutes, endMinutes: minutes });
                }}
                aria-label={`Select time range on ${DAYS_SHORT[day.getDay()]} ${day.getDate()}`}
              />

              {/* Selection overlay */}
              {drag && drag.day === di && (
                <div
                  className="dash-slot-selection"
                  style={{
                    top: ((Math.min(drag.startMinutes, drag.endMinutes) / 60) * hourHeight) + 2,
                    height: Math.max((((Math.max(drag.startMinutes, drag.endMinutes) + MINUTES_STEP) - Math.min(drag.startMinutes, drag.endMinutes)) / 60) * hourHeight - 4, 12),
                  }}
                  title={`${minutesToTimeLabel(Math.min(drag.startMinutes, drag.endMinutes))} – ${minutesToTimeLabel(Math.max(drag.startMinutes, drag.endMinutes) + MINUTES_STEP)}`}
                />
              )}

              {showNowLine && nowDayIndex === di && (
                <div
                  className="dash-now-line"
                  style={{ top: nowLineTop }}
                  aria-hidden="true"
                >
                  <span className="dash-now-dot" />
                </div>
              )}

              {dayAppointments.map((appt) => {
                  const { top, height, isVisible } = getEventStyle(appt, hourHeight);
                  if (!isVisible) return null;
                  const eventColor = appt.type === 'availability' ? '#6B7280' : (appt.color || '#1565A8');
                  const isPending = appt.type !== 'availability' && appt.status === 'pending';
                  const isCancelled = appt.type !== 'availability' && appt.status === 'cancelled';
                  const background = isPending || isCancelled ? '#ffffff' : `${eventColor}33`;
                  const compact = height < 40;
                  const startTimeString = new Date(appt.startTime).toLocaleTimeString([], {
                    hour: 'numeric',
                    minute: '2-digit',
                    timeZone: calendarTimeZone,
                  });
                  const eventTop = top + 2;
                  const eventHeight = Math.max(height - 4, 24);
                  const stacked = eventHeight >= 40;
                  const layout = layoutById.get(appt.id) || { lane: 0, lanesInCluster: 1 };
                  const widthPct = 100 / layout.lanesInCluster;
                  const leftPct = layout.lane * widthPct;

                  return (
                    <button
                      key={appt.id}
                      type="button"
                      className={`dash-event${compact ? ' compact' : ''}`}
                      style={{
                        top: eventTop,
                        height: eventHeight,
                        width: `calc(${widthPct}% - 4px)`,
                        left: `calc(${leftPct}% + 2px)`,
                        background,
                        border: `1px solid ${eventColor}66`,
                        borderLeft: `4px solid ${eventColor}`,
                        color: eventColor,
                        boxShadow: '0 1px 2px rgba(15, 23, 42, 0.08)',
                        zIndex: 3 + layout.lane,
                        textDecoration: isCancelled ? 'line-through' : 'none',
                        textDecorationThickness: isCancelled ? '1.5px' : undefined,
                        textDecorationColor: isCancelled ? eventColor : undefined,
                      }}
                      onClick={() => onEventClick(appt)}
                      title={`${appt.title} • ${startTimeString}`}
                    >
                      {stacked ? (
                        <>
                          <div className="dash-event-title">{appt.title}</div>
                          <div className="dash-event-time">{startTimeString}</div>
                          {eventHeight >= 60 && appt.location && (
                            <div className="dash-event-location">{appt.location}</div>
                          )}
                        </>
                      ) : (
                        <div className="dash-event-compact-line">
                          <span className="dash-event-compact-title">{appt.title}</span>
                          <span className="dash-event-compact-sep">,</span>
                          <span className="dash-event-compact-time">{startTimeString}</span>
                        </div>
                      )}
                    </button>
                  );
                })}
                  </>
                );
              })()}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}