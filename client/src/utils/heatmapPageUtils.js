/* AMANDA TRAN (95% contribution)*/
// JOCELYNE LI (0% estimated contribution) => Feature implementation, integration work, and quality refinements
import { makeKey } from '../components/HeatmapGrid';
import { thresholdHeatColor } from './heatColor';
import { toIsoWithOffset } from './dateTime';

export const PARTICIPANT_COLORS = Array.from({ length: 6 }, (_, index) =>
  thresholdHeatColor(index + 1, 6)
);




//Repeats the professor's selected availability into future weeks.
export function expandRecurring(selectedKeys, recurringWeeks) {
  const expanded = new Set(selectedKeys);

  selectedKeys.forEach((key) => {
    const [iso, ti] = key.split(':');

    for (let w = 1; w <= recurringWeeks; w += 1) {
      const d = new Date(iso);
      d.setDate(d.getDate() + w * 7);
      expanded.add(makeKey(toLocalIsoDate(d), ti));
    }
  });

  return expanded;
}

// SQLite may return "YYYY-MM-DD HH:mm:ss", which needs the T separator for reliable parsing.
export function parseSqliteDateTime(value) {
  return new Date(String(value).replace(' ', 'T'));
}

// Uses local date parts so timezone conversion does not shift the heatmap day.
export function toLocalIsoDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function toLocalDateTime(date) {
  return toIsoWithOffset(date);
}

export function addDaysToIsoDate(isoDate, amount) {
  const date = new Date(`${isoDate}T00:00:00`);
  date.setDate(date.getDate() + amount);
  return toLocalIsoDate(date);
}

export function compareIsoDates(firstIso, secondIso) {
  return new Date(`${firstIso}T00:00:00`).getTime() - new Date(`${secondIso}T00:00:00`).getTime();
}

export function minIsoDate(firstIso, secondIso) {
  return compareIsoDates(firstIso, secondIso) <= 0 ? firstIso : secondIso;
}

export function maxIsoDate(firstIso, secondIso) {
  return compareIsoDates(firstIso, secondIso) >= 0 ? firstIso : secondIso;
}

export function countInclusiveDays(startIso, endIso) {
  const start = new Date(`${startIso}T00:00:00`);
  const end = new Date(`${endIso}T00:00:00`);
  const diff = Math.floor((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000));
  return Math.max(diff + 1, 1);
}

// Converts a real backend slot time into the matching visible grid cell.
export function buildGridKeyFromDate(date, startHour, endHour) {
  const hour = date.getHours();
  const minute = date.getMinutes();
  const slotIndex = (hour - startHour) * 2 + (minute >= 30 ? 1 : 0);
  const totalSlots = (endHour - startHour) * 2;

  if (slotIndex < 0 || slotIndex >= totalSlots) return null;

  return makeKey(toLocalIsoDate(date), slotIndex);
}

// Converts selected grid cells into backend-ready time ranges.
export function keysToSlots(keys, startHour) {
  return Array.from(keys).map((key) => {
    const [iso, timeIndexString] = key.split(':');
    const timeIndex = Number(timeIndexString);
    const start = new Date(`${iso}T00:00:00`);
    start.setHours(startHour + Math.floor(timeIndex / 2), timeIndex % 2 === 0 ? 0 : 30, 0, 0);

    const end = new Date(start.getTime() + 30 * 60 * 1000);

    return {
      start_time: toLocalDateTime(start),
      end_time: toLocalDateTime(end),
    };
  });
}

export function keyToDateRange(key, startHour) {
  const [iso, timeIndexString] = key.split(':');
  const timeIndex = Number(timeIndexString);
  const start = new Date(`${iso}T00:00:00`);
  start.setHours(startHour + Math.floor(timeIndex / 2), timeIndex % 2 === 0 ? 0 : 30, 0, 0);

  const end = new Date(start.getTime() + 30 * 60 * 1000);

  return { start, end };
}

// Reopens saved heatmaps on the same date and hour range where they were created.
export function deriveRangeFromSlots(slotRows) {
  if (!slotRows.length) return null;

  const starts = slotRows.map((slot) => parseSqliteDateTime(slot.startTime));
  const earliest = new Date(Math.min(...starts.map((d) => d.getTime())));
  const rangeStart = new Date(`${toLocalIsoDate(earliest)}T00:00:00`);
  const visibleStarts = starts;
  const visibleEnds = slotRows.map((slot) => parseSqliteDateTime(slot.endTime));
  const latestStart = new Date(Math.max(...visibleStarts.map((d) => d.getTime())));
  const latestVisible = new Date(Math.max(...visibleEnds.map((d) => d.getTime())));

  return {
    startDate: toLocalIsoDate(rangeStart),
    endDate: toLocalIsoDate(latestStart),
    startHour: Math.min(...visibleStarts.map((d) => d.getHours())),
    endHour: latestVisible.getMinutes() > 0 ? latestVisible.getHours() + 1 : latestVisible.getHours(),
  };
}

// Turns a saved submission back into the grid keys the heatmap understands.
// This is what lets old professor/student selections reappear when the page reloads.
export function mapSubmissionSlotsToKeys(submission, startHour, endHour) {
  return new Set(
    (submission?.slots || [])
      .map((slot) => buildGridKeyFromDate(parseSqliteDateTime(slot.startTime), startHour, endHour))
      .filter(Boolean)
  );
}

// Keeps heatmap links in one place so pages do not hand-build URLs differently.
export function buildHeatmapPath(role, heatmapId) {
  return `/heatmap/${role}/${heatmapId}`;
}

// Sends users back to the right dashboard after they leave the heatmap flow.
export function buildDashboardPath(user) {
  if (!user?.role) return '/';

  return user.role === 'professor'
    ? '/dashboard/professor'
    : '/dashboard/student';
}
