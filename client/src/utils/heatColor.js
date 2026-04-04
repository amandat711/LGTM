export function heatColor(count, max) {
  if (count === 0 || max === 0) return '#efefef';
  const t = count / max;
  if (t <= 0.25) return '#ffc8cc';
  if (t <= 0.5)  return '#f07080';
  if (t <= 0.75) return '#d02030';
  return '#E31429';
}
