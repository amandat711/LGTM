/* AMANDA TRAN (100% contribution) */


/*This calendar page was reference from the Bootstrap calendar example at <Colorlib>

APA Style
Colorlib. (2025). Calendar V04. Colorlib. https://colorlib.com/wp/template/calendar-04/</Colorlib>

*/


import { useMemo } from 'react';
import '../styles/BookingCalendar.css';

// We keep the month names here instead of asking each page to format them.
// That way every place that uses this calendar speaks the same visual language:
// "April 2026", "May 2026", and so on.
const MONTH_NAMES = [
  'January',
  'February',
  'March',
  'April',
  'May',
  'June',
  'July',
  'August',
  'September',
  'October',
  'November',
  'December',
];

// The Bootstrap example that inspired this used compact weekday headers.
// Keeping them short makes the calendar feel light and keeps it from crowding
// the booking page beside the time-slot list.
const WEEKDAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];

// Turn a Date into the exact key the booking page uses to group slots.
// This looks tiny, but it matters: toISOString() converts to UTC, which can
// accidentally move a date backward/forward depending on the user's timezone.
// Building "YYYY-MM-DD" manually keeps the selected calendar day honest.
export function toCalendarDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

// Build the calendar grid for a month.
// The goal is the same as the Bootstrap calendar snippet: create enough cells
// so dates line up under the correct weekday. Real days become objects, while
// blank spaces are stored as null.
function buildCalendarCells(monthDate) {
  const year = monthDate.getFullYear();
  const month = monthDate.getMonth();
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];

  // Add blanks before day 1. If the month starts on Wednesday, we need empty
  // Sunday/Monday/Tuesday cells first so "1" appears under WED.
  for (let i = 0; i < firstDay.getDay(); i += 1) {
    cells.push(null);
  }

  // Add each real day. We store both the number shown to the user and a stable
  // date key that the parent page can use to look up appointment slots.
  for (let day = 1; day <= daysInMonth; day += 1) {
    const date = new Date(year, month, day);
    cells.push({
      day,
      dateKey: toCalendarDateKey(date),
    });
  }

  // Fill the final row with blanks. This is mostly for polish: the calendar
  // feels calmer when every week row has the same shape.
  while (cells.length % 7 !== 0) {
    cells.push(null);
  }

  return cells;
}

/**
 * BookingCalendar

 Reusable monthly date picker used by booking flows.
 
  This component was inspired by the Bootstrap calendar layout the booking
  page was modeled after, but it is written in React so we do not mix jQuery
 DOM updates into the app. The parent page owns the data; this component just
  draws the month and tells the parent which date the user clicked.

 Props, in plain English:
- monthDate: Date object representing the currently visible month.
 - selectedDate: "YYYY-MM-DD" date key for the active day.
 - availableDates: Set or array of "YYYY-MM-DD" keys that should be marked
  as available with the red availability styling.
 - onSelectDate: called with the clicked date key.
 - onMonthChange: called with -1 or +1 when the user clicks month arrows.
 - title: small label above the month heading.
 - legendLabel: text shown beside the red availability dot.

 It intentionally does not know what a professor, appointment, or heatmap is.
 That separation keeps it reusable: any page can hand it available dates and
respond when the user chooses one.
 */
export default function BookingCalendar({
  monthDate,
  selectedDate,
  availableDates,
  onSelectDate = () => {},
  onMonthChange = () => {},
  title = 'Select a Date & Time',
  legendLabel = 'Available appointment day',
}) {
  // A small guardrail for future reuse: if a page forgets to pass monthDate, we
  // show the current month instead of breaking the whole screen.
  const safeMonthDate = useMemo(() => {
    if (monthDate instanceof Date && !Number.isNaN(monthDate.getTime())) {
      return monthDate;
    }

    return new Date();
  }, [monthDate]);

  // Parent pages may naturally have available dates as either an array or a Set.
  // We normalize to a Set here so checking "does this day have slots?" stays
  // simple and fast when rendering all the calendar cells.
  const availableDateSet = useMemo(
    () => (availableDates instanceof Set ? availableDates : new Set(availableDates || [])),
    [availableDates]
  );

  // Recalculate the month grid only when the visible month changes. This keeps
  // the component predictable and avoids rebuilding the same cells on every
  // unrelated parent render.
  const calendarCells = useMemo(() => buildCalendarCells(safeMonthDate), [safeMonthDate]);
  const calendarMonthLabel = `${MONTH_NAMES[safeMonthDate.getMonth()]} ${safeMonthDate.getFullYear()}`;

  return (
    <aside className="booking-calendar-panel">
      <div className="booking-calendar-header">
        <div>
          <p className="booking-calendar-kicker">{title}</p>
          <h2>{calendarMonthLabel}</h2>
        </div>

        <div className="booking-calendar-nav">
          <button
            type="button"
            onClick={() => onMonthChange(-1)}
            aria-label="Previous month"
          >
            ‹
          </button>
          <button
            type="button"
            onClick={() => onMonthChange(1)}
            aria-label="Next month"
          >
            ›
          </button>
        </div>
      </div>

      <div className="booking-calendar-weekdays">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>

      <div className="booking-calendar-grid">
        {calendarCells.map((cell, index) => {
          // Blank cells are the quiet little spacers that make the month line
          // up correctly. They are not buttons because there is no real date
          // behind them.
          if (!cell) {
            return <span key={`empty-${index}`} className="booking-calendar-day empty" />;
          }

          // A date can be selected even if it has no slots. That lets the page
          // show a helpful empty message instead of making the calendar feel
          // unresponsive.
          const hasSlots = availableDateSet.has(cell.dateKey);
          const isSelected = selectedDate === cell.dateKey;

          return (
            <button
              key={cell.dateKey}
              type="button"
              className={`booking-calendar-day${hasSlots ? ' has-slots' : ''}${isSelected ? ' selected' : ''}`}
              onClick={() => onSelectDate(cell.dateKey)}
            >
              <span>{cell.day}</span>
            </button>
          );
        })}
      </div>

      <div className="booking-calendar-legend">
        <span className="calendar-dot" />
        <span>{legendLabel}</span>
      </div>
    </aside>
  );
}
