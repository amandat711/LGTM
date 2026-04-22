/* AMANDA TRAN */
/* DATA TRANSFORMATION LAYER */

// makeKey creates the shared "YYYY-MM-DD:index" cell ID used by the heatmap grids.
import { makeKey } from '../components/HeatmapGrid';
import { thresholdHeatColor } from './heatColor';

// Colours used in the professor group heatmap participant chips.
// These follow the same light-to-strong red scale used by thresholdHeatColor.
export const PARTICIPANT_COLORS = Array.from({ length: 6 }, (_, index) =>
  thresholdHeatColor(index + 1, 6)
);

/**
 * Takes the professor's selected grid cells and repeats them into future weeks.
 * Used only when the professor chooses the recurring availability option.
 */
// Copies the professor's selected availability into future weeks when recurrence is enabled.
export function expandRecurring(selectedKeys, recurringWeeks) {
  // Start with the original selections so the current week is included too.
  const expanded = new Set(selectedKeys);

  // Each selected key looks like "2026-04-07:3".
  selectedKeys.forEach((key) => {
    // iso is the date, and ti is the 30-minute time-slot index.
    const [iso, ti] = key.split(':');

    // Add the same time-slot index for each future week.
    for (let w = 1; w <= recurringWeeks; w += 1) {
      // Build a date from the selected day.
      const d = new Date(iso);
      // Move forward by w weeks.
      d.setDate(d.getDate() + w * 7);
      // Save the future week's matching grid key.
      expanded.add(makeKey(toLocalIsoDate(d), ti));
    }
  });

  // A Set automatically avoids duplicate keys.
  return expanded;
}

/**
 * Turns a SQLite datetime string into a JavaScript Date.
 * This prevents browser parsing issues when SQLite returns a space instead of "T".
 */
// SQLite can return "YYYY-MM-DD HH:mm:ss"; JavaScript Date is happier with a "T" separator.
export function parseSqliteDateTime(value) {
  // Example: "2026-04-07 09:30:00" becomes "2026-04-07T09:30:00".
  return new Date(String(value).replace(' ', 'T'));
}

/**
 * Formats a Date as YYYY-MM-DD using the user's local timezone.
 * This format is used in every heatmap grid key.
 */
// Converts a Date into the local date format used at the start of each grid key.
export function toLocalIsoDate(date) {
  // Use local date pieces instead of toISOString so timezone conversion does not shift the day.
  const year = date.getFullYear();
  // JavaScript months start at 0, so add 1 for human calendar months.
  const month = String(date.getMonth() + 1).padStart(2, '0');
  // Keep the day two digits for consistent keys.
  const day = String(date.getDate()).padStart(2, '0');

  // Final shape: "YYYY-MM-DD".
  return `${year}-${month}-${day}`;
}

/**
 * Formats a Date as YYYY-MM-DDTHH:mm:ss.
 * This is the datetime format sent when saving heatmap slots.
 */
// Converts a Date into the local datetime string sent to the backend.
export function toLocalDateTime(date) {
  // Keep each time part two digits so backend values are consistent.
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // Final shape: "YYYY-MM-DDTHH:mm:ss".
  return `${toLocalIsoDate(date)}T${hours}:${minutes}:${seconds}`;
}

// Moves an ISO date forward or backward by a number of calendar days.
export function addDaysToIsoDate(isoDate, amount) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return toLocalIsoDate(date);
}

// Compares two ISO dates without relying on browser locale formatting.
export function compareIsoDates(firstIso, secondIso) {
  return new Date(`${firstIso}T00:00:00`).getTime() - new Date(`${secondIso}T00:00:00`).getTime();
}

// Returns the earlier of two ISO dates.
export function minIsoDate(firstIso, secondIso) {
  return compareIsoDates(firstIso, secondIso) <= 0 ? firstIso : secondIso;
}

// Returns the later of two ISO dates.
export function maxIsoDate(firstIso, secondIso) {
  return compareIsoDates(firstIso, secondIso) >= 0 ? firstIso : secondIso;
}

// Counts calendar days inclusively, so Apr 7 through Apr 11 returns 5.
export function countInclusiveDays(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(diff + 1, 1);
}

/**
 * Converts a real backend slot start time into the matching grid key.
 * Returns null if that slot is outside the current visible grid hours.
 */
// Converts a real Date into the matching heatmap grid key.
export function buildGridKeyFromDate(date, startHour, endHour) {
  // Pull the clock time out of the Date.
  const hour = date.getHours();
  const minute = date.getMinutes();

  // There are two 30-minute rows per hour; :30 counts as the second row.
  const slotIndex = (hour - startHour) * 2 + (minute >= 30 ? 1 : 0);
  // Total number of 30-minute rows currently visible in the grid.
  const totalSlots = (endHour - startHour) * 2;

  // If a saved slot is outside the current visible hours, do not draw it on the grid.
  if (slotIndex < 0 || slotIndex >= totalSlots) return null;

  // Build the same "YYYY-MM-DD:index" key used by HeatmapGrid cells.
  return makeKey(toLocalIsoDate(date), slotIndex);
}

/**
 * Converts selected heatmap keys into backend-ready time ranges.
 * Used when a professor saves availability and when a student submits availability.
 */
// Converts selected grid keys into backend slot objects.
export function keysToSlots(keys, startHour) {
  // The UI stores selections as a Set, but the backend needs an array of time ranges.
  return Array.from(keys).map((key) => {
    // Split "YYYY-MM-DD:index" back into a date and time-slot index.
    const [iso, timeIndexString] = key.split(':');
    // Convert the index from text into a number for time math.
    const timeIndex = Number(timeIndexString);

    // Start at midnight on that date, then move to the selected slot time.
    const start = new Date(`${iso}T00:00:00`);
    // Even indexes are on the hour; odd indexes are on the half-hour.
    start.setHours(startHour + Math.floor(timeIndex / 2), timeIndex % 2 === 0 ? 0 : 30, 0, 0);
    // Every heatmap slot is 30 minutes long.
    const end = new Date(start.getTime() + 30 * 60 * 1000);

    // This is the shape saveHeatmapSubmission expects.
    return {
      start_time: toLocalDateTime(start),
      end_time: toLocalDateTime(end),
    };
  });
}

/**
 * Converts one selected heatmap key into a start/end Date pair.
 * Used when the professor confirms a group heatmap booking.
 */
// Converts one selected grid key into Date objects for appointment creation.
export function keyToDateRange(key, startHour) {
  // Split "YYYY-MM-DD:index" into date and slot index.
  const [iso, timeIndexString] = key.split(':');
  // Convert the slot index into a number.
  const timeIndex = Number(timeIndexString);

  // Rebuild the Date at midnight for the selected day.
  const start = new Date(`${iso}T00:00:00`);
  // Move from midnight to the selected 30-minute slot.
  start.setHours(startHour + Math.floor(timeIndex / 2), timeIndex % 2 === 0 ? 0 : 30, 0, 0);
  // The appointment ends 30 minutes after the selected start.
  const end = new Date(start.getTime() + 30 * 60 * 1000);

  // Return Date objects so the caller can format them before sending to the backend.
  return { start, end };
}

/**
 * Looks at saved slot rows and chooses the best date range and hours for the grid.
 * This lets old heatmaps reopen on the same week/hour range where they were created.
 */
// Reads saved backend slots and decides what week/hour range the grid should show.
export function deriveRangeFromSlots(slotRows) {
  // If there are no saved slots, keep the default grid setup on the page.
  if (!slotRows.length) return null;

  // Convert each saved slot start into a JavaScript Date.
  const starts = slotRows.map((slot) => parseSqliteDateTime(slot.startTime));
  // Find the earliest saved start time.
  const earliest = new Date(Math.min(...starts.map((d) => d.getTime())));
  // Start the visible range at midnight on the earliest saved day.
  const rangeStart = new Date(`${toLocalIsoDate(earliest)}T00:00:00`);
  // Parse all saved start times.
  const visibleStarts = starts;
  // Parse all saved end times so the grid includes the full final slot.
  const visibleEnds = slotRows.map((slot) => parseSqliteDateTime(slot.endTime));
  // Find the latest saved start date so the full heatmap range can be paged through.
  const latestStart = new Date(Math.max(...visibleStarts.map((d) => d.getTime())));
  // Find the latest visible end time.
  const latestVisible = new Date(Math.max(...visibleEnds.map((d) => d.getTime())));

  // Return the exact state values used by ProfessorHeatmap and StudentHeatmap.
  return {
    // First date shown in the grid.
    startDate: toLocalIsoDate(rangeStart),
    // Last saved date in the range.
    endDate: toLocalIsoDate(latestStart),
    // Earliest hour shown in the grid.
    startHour: Math.min(...visibleStarts.map((d) => d.getHours())),
    // If the latest slot ends at a half-hour, round up so the whole slot is visible.
    endHour: latestVisible.getMinutes() > 0 ? latestVisible.getHours() + 1 : latestVisible.getHours(),
  };
}

/**
 * Converts a saved submission into grid keys.
 * This is how saved professor slots, saved student slots, and group heatmap data get drawn.
 */
// Converts a backend submission's slots into the Set of grid keys the UI expects.
export function mapSubmissionSlotsToKeys(submission, startHour, endHour) {
  // The grid checks selection with selected.has(key), so a Set is the fastest shape here.
  return new Set(
    // If there is no submission yet, treat it like an empty list of slots.
    (submission?.slots || [])
      // Convert each saved backend slot into the matching grid key.
      .map((slot) => buildGridKeyFromDate(parseSqliteDateTime(slot.startTime), startHour, endHour))
      // Remove null values for slots that are outside the visible grid.
      .filter(Boolean)
  );
}

/**
 * Builds a heatmap route for a given role.
 * Keeping this in one helper avoids hand-writing URL strings in multiple places.
 */
// Builds the URL for either side of the same heatmap.
export function buildHeatmapPath(role, heatmapId) {
  // Example: "/heatmap/professor/12" or "/heatmap/student/12".
  return `/heatmap/${role}/${heatmapId}`;
}

/**
 * Builds the dashboard route for the logged-in user's role.
 * Used by the heatmap navbar back button.
 */
// Builds the correct dashboard URL for whichever user is logged in.
export function buildDashboardPath(user) {
  // If there is no user loaded yet, fall back to the landing page.
  if (!user?.role) return '/';

  // Professors and students have different dashboard routes.
  return user.role === 'professor'
    ? '/dashboard/professor'
    : '/dashboard/student';
}
