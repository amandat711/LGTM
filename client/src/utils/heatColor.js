/**
 * Returns a background color for a heatmap cell based on availability count.
 * @param {number} count - how many participants are free at this slot
 * @param {number} max   - total number of active participants
 * @returns {string} hex color
 */
export function heatColor(count, max) {
  if (count === 0 || max === 0) return '#e8e8e8';
  const t = count / max;
  if (t <= 0.25) return '#f9c0c5';
  if (t <= 0.5)  return '#f07080';
  if (t <= 0.75) return '#d02030';
  return '#E31429';
}
