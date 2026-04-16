export function heatColor(count, max) {
  if (count === 0 || max === 0) return '#efefef';
  const t = count / max;
  // Smooth RGB interpolation: very light pink → deep dark red (when2meet style)
  const r = Math.round(255 + (130 - 255) * t);   // 255 → 130
  const g = Math.round(220 + (  0 - 220) * t);   // 220 → 0
  const b = Math.round(222 + ( 18 - 222) * t);   // 222 → 18
  return `rgb(${r}, ${g}, ${b})`;
}
