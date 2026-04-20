export function heatColor(count, max) {
  if (count === 0 || max === 0) return '#efefef';
  const ratio = count / max;

  // Light red -> strong red. This keeps high-availability professor heatmap
  // cells noticeable without becoming so dark that they read as burgundy.
  const start = { r: 255, g: 232, b: 235 };
  const end = { r: 214, g: 35, b: 55 };
  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}

export function thresholdHeatColor(count, max, thresholdRatio = 1) {
  if (count === 0 || max === 0) return '#efefef';

  // We keep this wrapper because the group heatmap still talks about a
  // threshold, but visually the cells should stay light red -> dark red.
  return heatColor(count, max);
}

export function studentAvailabilityColor(otherCount, totalOthers, isSelected) {
  if (isSelected) {
    return '#8f1024';
  }

  if (!totalOthers || otherCount <= 0) {
    return '#ffe0e3';
  }

  const ratio = Math.min(otherCount / totalOthers, 1);
  const start = { r: 255, g: 198, b: 205 };
  const end = { r: 209, g: 55, b: 75 };
  const r = Math.round(start.r + (end.r - start.r) * ratio);
  const g = Math.round(start.g + (end.g - start.g) * ratio);
  const b = Math.round(start.b + (end.b - start.b) * ratio);

  return `rgb(${r}, ${g}, ${b})`;
}
