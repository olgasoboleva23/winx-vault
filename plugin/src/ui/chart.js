// Palette color for charts, read from the winx-tokens.css custom props so
// charts follow re-theming. Returns an rgba() string Chart.js accepts.
export function chartColor(token, alpha = 1) {
  const hex = getComputedStyle(document.body).getPropertyValue(token).trim();
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return `rgba(150, 150, 150, ${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}
