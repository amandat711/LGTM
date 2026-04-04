import React from 'react';
import { heatColor } from '../utils/heatColor';
import { useDragSelect } from '../hooks/useDragSelect';

// Time slots: 8:00 AM → 9:30 PM in 30-min increments
export const TIMES = (() => {
  const slots = [];
  for (let h = 8; h <= 21; h++) {
    const label = (h <= 12 ? h : h - 12) + ':00 ' + (h < 12 ? 'AM' : 'PM');
    slots.push(label);
    if (h < 21) slots.push((h <= 12 ? h : h - 12) + ':30 ' + (h < 12 ? 'AM' : 'PM'));
  }
  return slots;
})();

// ─────────────────────────────────────────────────────────────
// PersonalGrid — user marks their own availability
//
// Props:
//   days        – [{ short: 'Mon', date: 'Apr 7' }]
//   selected    – Set<number> of cell keys
//   setSelected – state setter
// ─────────────────────────────────────────────────────────────
export function PersonalGrid({ days, selected, setSelected }) {
  const { onMouseDown, onMouseEnter } = useDragSelect(selected, setSelected);

  return (
    <div className="grid-wrap">
      {/* Time labels */}
      <div className="time-col">
        {TIMES.map((t, i) => (
          <div key={i} className="time-label">
            {i % 2 === 0 ? t : ''}
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="days-grid">
        {days.map((day, di) => (
          <div key={di} className="day-col">
            <div className="day-header">
              <span>{day.short}</span>
              {day.date}
            </div>
            {TIMES.map((_, ti) => {
              const key = di * TIMES.length + ti;
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
// GroupGrid — heatmap aggregating all participants
//
// Props:
//   days            – [{ short: string, date: string }]
//   participants    – [{ name: string, color: string, slots: number[] }]
//   activeNames     – Set<string>  (which participants to include)
//   selectedKey     – number | null  (currently selected cell)
//   onSelectKey     – (key: number, meta: { timeLabel, dayShort, count, max, who }) => void
// ─────────────────────────────────────────────────────────────
export function GroupGrid({ days, participants, activeNames, selectedKey, onSelectKey }) {
  const active = participants.filter((p) => activeNames.has(p.name));
  const max    = active.length || 1;

  return (
    <div className="grid-wrap">
      {/* Time labels */}
      <div className="time-col">
        {TIMES.map((t, i) => (
          <div key={i} className="time-label">
            {i % 2 === 0 ? t : ''}
          </div>
        ))}
      </div>

      {/* Day columns */}
      <div className="days-grid">
        {days.map((day, di) => (
          <div key={di} className="day-col">
            <div className="day-header">
              <span>{day.short}</span>
              {day.date}
            </div>
            {TIMES.map((timeLabel, ti) => {
              const key   = di * TIMES.length + ti;
              const who   = active.filter((p) => p.slots.includes(ti));
              const count = who.length;

              return (
                <div
                  key={ti}
                  className={`gcell${selectedKey === key ? ' g-selected' : ''}`}
                  style={{ background: heatColor(count, max) }}
                  onClick={() =>
                    onSelectKey(key, {
                      timeLabel,
                      dayShort: day.short,
                      fullDate: day.date,
                      count,
                      max,
                      who,
                    })
                  }
                >
                  <div className="cell-tooltip">
                    {count === 0
                      ? 'Nobody free'
                      : `${count}/${max}: ${who.map((p) => p.name).join(', ')}`}
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
