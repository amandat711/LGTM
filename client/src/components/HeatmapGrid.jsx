import React from 'react';
import { studentAvailabilityColor, thresholdHeatColor } from '../utils/heatColor';
import { useDragSelect } from '../hooks/useDragSelect';

const GROUP_MEETING_THRESHOLD_RATIO = 1;

// KEY FORMAT
//   Every cell is identified by a string: "YYYY-MM-DD:ti"
//   e.g. "2026-04-07:3" = Apr 7, 4th time slot
//   This means slots are date-specific — never bleed across weeks.
//   Recurring slots are expanded in ProfessorHeatmap.jsx before being passed down.

export function makeKey(iso, ti) {
  return `${iso}:${ti}`;
}

// PersonalGrid — professor marks their own availability
// ─────────────────────────────────────────────────────────────
export function PersonalGrid({ days, times, selected, setSelected }) {
  const { onMouseDown, onMouseEnter } = useDragSelect(selected, setSelected);

  return (
    <div className="grid-wrap">
      <TimeLabels times={times} />
      <div className="days-grid">
        {days.map((day) => (
          <div key={day.iso} className="day-column">
            <DayHeader day={day} />
            {times.map((_, ti) => {
              const key = makeKey(day.iso, ti);
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


// ProfAvailGrid — student view, only professor's slots are clickable.
// If otherSlotCounts + totalOthers are provided the cells show a
// when2meet-style heatmap: darker = more students already chose that slot.
// ─────────────────────────────────────────────────────────────
export function ProfAvailGrid({ days, times, profSlots, selected, setSelected, otherSlotCounts, totalOthers }) {
  const { onMouseDown, onMouseEnter } = useDragSelect(selected, setSelected);
  const hasHeatmap = otherSlotCounts && totalOthers > 0;

  return (
    <div className="grid-wrap">
      <TimeLabels times={times} />
      <div className="days-grid">
        {days.map((day) => (
          <div key={day.iso} className="day-column">
            <DayHeader day={day} />
            {times.map((timeLabel, ti) => {
              const key     = makeKey(day.iso, ti);
              const isAvail = profSlots.has(key);
              const isSel   = selected.has(key);
              const count   = hasHeatmap ? (otherSlotCounts.get(key) || 0) : 0;

              if (!isAvail) {
                return <div key={ti} className="cell" style={{ cursor: 'default' }} />;
              }

              const bg = studentAvailabilityColor(count, hasHeatmap ? totalOthers : 0, isSel);

              const tooltipText = isSel
                ? `${timeLabel} — your selection`
                : hasHeatmap
                  ? `${count}/${totalOthers} student${totalOthers !== 1 ? 's' : ''} available — click to select`
                  : `${timeLabel} — click to select`;

              return (
                <div
                  key={ti}
                  className={`cell prof-available${isSel ? ' selected' : ''}`}
                  style={{ cursor: 'pointer', background: bg, border: isSel ? '1.5px solid var(--red)' : '1px solid transparent' }}
                  onMouseDown={onMouseDown(key)}
                  onMouseEnter={onMouseEnter(key)}
                >
                  <div className="cell-tooltip">{tooltipText}</div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}


// GroupGrid — read-only heatmap of all participants
// participants[].slots is string[] of "iso:ti" keys
// ─────────────────────────────────────────────────────────────
export function GroupGrid({ days, times, participants, activeNames, selectedKeys, setSelectedKeys, onSelectKey }) {
  const active = participants.filter(p => activeNames.has(p.name));
  const max    = active.length || 1;
  const { onMouseDown, onMouseEnter, isDragging } = useDragSelect(selectedKeys, setSelectedKeys);

  return (
    <div className="grid-wrap">
      <TimeLabels times={times} />
      <div className="days-grid">
        {days.map((day) => (
          <div key={day.iso} className="day-column">
            <DayHeader day={day} />
            {times.map((timeLabel, ti) => {
              const key   = makeKey(day.iso, ti);
              const who   = active.filter(p => p.slots.includes(key));
              const count = who.length;
              const isSelected = selectedKeys.has(key);
              const meta = { timeLabel, day, count, max, who };

              return (
                <div
                  key={ti}
                  className={`group-cell${isSelected ? ' selected' : ''}`}
                  style={{ background: thresholdHeatColor(count, max, GROUP_MEETING_THRESHOLD_RATIO) }}
                  onMouseDown={(event) => {
                    onMouseDown(key)(event);
                    onSelectKey(key, meta);
                  }}
                  onMouseEnter={() => {
                    onMouseEnter(key)();
                    if (isDragging.current) onSelectKey(key, meta);
                  }}
                >
                  <div className="cell-tooltip">
                    {count === 0
                      ? 'Nobody free'
                      : count >= Math.ceil(max * GROUP_MEETING_THRESHOLD_RATIO)
                        ? `Threshold reached (${count}/${max}): ${who.map(p => p.name).join(', ')}`
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
  const thresholdCount = Math.ceil(max * GROUP_MEETING_THRESHOLD_RATIO);

  return (
    <div className="legend">
      <span className="legend-label">0 available</span>
      <div className="legend-colors">
        {Array.from({ length: max + 1 }, (_, i) => (
          <div key={i} className="color-swatch" style={{ background: thresholdHeatColor(i, max, GROUP_MEETING_THRESHOLD_RATIO) }} />
        ))}
      </div>
      <span className="legend-label">Threshold {thresholdCount}/{max || 1}</span>
    </div>
  );
}

export function GridPager({ rangeLabel, canGoBack, canGoForward, onPrev, onNext, children }) {
  return (
    <>
      <div className="grid-pager">
        <button
          className="grid-pager-button"
          type="button"
          onClick={onPrev}
          disabled={!canGoBack}
          aria-label="Show previous days"
          title="Show previous days"
        >
          ‹
        </button>
        <span className="grid-pager-label">{rangeLabel}</span>
        <button
          className="grid-pager-button"
          type="button"
          onClick={onNext}
          disabled={!canGoForward}
          aria-label="Show next days"
          title="Show next days"
        >
          ›
        </button>
      </div>
      {children}
    </>
  );
}

function TimeLabels({ times }) {
  return (
    <div className="time-column">
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
