import React from 'react';
import { heatColor } from '../utils/heatColor';
import { useDragSelect } from '../hooks/useDragSelect';

// ─────────────────────────────────────────────────────────────
// PersonalGrid — drag to mark YOUR availability
// Used by: professor setting their slots, student (unrestricted)
//
// Props:
//   days        – [{ short, date, iso }]
//   times       – string[]
//   selected    – Set<number>
//   setSelected – setter
// ─────────────────────────────────────────────────────────────
export function PersonalGrid({ days, times, selected, setSelected }) {
  const { onMouseDown, onMouseEnter } = useDragSelect(selected, setSelected);

  return (
    <div className="grid-wrap">
      <TimeLabels times={times} />
      <div className="days-grid">
        {days.map((day, di) => (
          <div key={di} className="day-col">
            <DayHeader day={day} />
            {times.map((_, ti) => {
              const key = di * times.length + ti;
              return (
                <div
                  key={ti}
                  className={`cell${selected.has(key) ? ' selected' : ''}`}
                  onMouseDown={onMouseDown(key)}
                  onMouseEnter={onMouseEnter(key)}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// ProfAvailGrid — student view: sees professor's available slots
// highlighted in light red. Student can only SELECT those cells.
//
// Props:
//   days          – [{ short, date, iso }]
//   times         – string[]
//   profSlots     – Set<number>  (keys the professor marked)
//   selected      – Set<number>  (student's selection)
//   setSelected   – setter
// ─────────────────────────────────────────────────────────────
export function ProfAvailGrid({ days, times, profSlots, selected, setSelected }) {
  const { onMouseDown, onMouseEnter } = useDragSelect(selected, setSelected);

  function handleMouseDown(key, isAvail) {
    if (!isAvail) return () => {}; // can't select unavailable slots
    return onMouseDown(key);
  }

  function handleMouseEnter(key, isAvail) {
    if (!isAvail) return () => {};
    return onMouseEnter(key);
  }

  return (
    <div className="grid-wrap">
      <TimeLabels times={times} />
      <div className="days-grid">
        {days.map((day, di) => (
          <div key={di} className="day-col">
            <DayHeader day={day} />
            {times.map((timeLabel, ti) => {
              const key     = di * times.length + ti;
              const isAvail = profSlots.has(key);
              const isSel   = selected.has(key);

              let cls = 'cell';
              if (isAvail && isSel) cls += ' selected';
              else if (isAvail)     cls += ' prof-available';

              return (
                <div
                  key={ti}
                  className={cls}
                  style={{ cursor: isAvail ? 'pointer' : 'default' }}
                  onMouseDown={handleMouseDown(key, isAvail)}
                  onMouseEnter={handleMouseEnter(key, isAvail)}
                  title={!isAvail ? 'Not available' : ''}
                >
                  {isAvail && (
                    <div className="cell-tooltip">
                      {isSel ? `${timeLabel} — selected` : `${timeLabel} — click to select`}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// GroupGrid — read-only heatmap of all participants' availability
//
// Props:
//   days          – [{ short, date, iso }]
//   times         – string[]
//   participants  – [{ name, color, slots: number[] }]
//   activeNames   – Set<string>
//   selectedKey   – number | null
//   onSelectKey   – (key, meta) => void
// ─────────────────────────────────────────────────────────────
export function GroupGrid({ days, times, participants, activeNames, selectedKey, onSelectKey }) {
  const active = participants.filter(p => activeNames.has(p.name));
  const max    = active.length || 1;

  return (
    <div className="grid-wrap">
      <TimeLabels times={times} />
      <div className="days-grid">
        {days.map((day, di) => (
          <div key={di} className="day-col">
            <DayHeader day={day} />
            {times.map((timeLabel, ti) => {
              const key   = di * times.length + ti;
              const who   = active.filter(p => p.slots.includes(ti));
              const count = who.length;

              return (
                <div
                  key={ti}
                  className={`gcell${selectedKey === key ? ' g-selected' : ''}`}
                  style={{ background: heatColor(count, max) }}
                  onClick={() => onSelectKey(key, { timeLabel, day, count, max, who })}
                >
                  <div className="cell-tooltip">
                    {count === 0
                      ? 'Nobody free'
                      : `${count}/${max}: ${who.map(p => p.name).join(', ')}`}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// HeatmapLegend
// ─────────────────────────────────────────────────────────────
export function HeatmapLegend({ max }) {
  return (
    <div className="legend">
      <span className="legend-label">0 available</span>
      <div className="legend-swatch">
        {Array.from({ length: max + 1 }, (_, i) => (
          <div key={i} className="swatch" style={{ background: heatColor(i, max) }} />
        ))}
      </div>
      <span className="legend-label">All available</span>
    </div>
  );
}

// ─── Internal helpers ─────────────────────────────────────────
function TimeLabels({ times }) {
  return (
    <div className="time-col">
      {times.map((t, i) => (
        <div key={i} className="time-label">
          {i % 2 === 0 ? t : ''}
        </div>
      ))}
    </div>
  );
}

function DayHeader({ day }) {
  return (
    <div className="day-header">
      <div className="day-header-name">{day.short}</div>
      <div className="day-header-date">{day.date}</div>
    </div>
  );
}
