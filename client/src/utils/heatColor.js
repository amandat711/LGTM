export function heatColor(count, max) {
  if (count === 0 || max === 0) return '#efefef';
  const ratio = count / max;
  const opacity = 0.16 + ratio * 0.74;

  return `rgba(227, 20, 41, ${opacity.toFixed(2)})`;
}

export function thresholdHeatColor(count, max, thresholdRatio = 1) {
  if (count === 0 || max === 0) return '#efefef';

  const ratio = count / max;
  const reachedThreshold = ratio >= thresholdRatio;
  const opacity = 0.16 + ratio * 0.74;

  if (reachedThreshold) {
    return `rgba(42, 140, 95, ${Math.max(opacity, 0.82).toFixed(2)})`;
  }

  return heatColor(count, max);
}
