// Markup in backticks: html`<div class="winx-weight">${kg} kg</div>`. Every value put in is escaped (a task with
// "<" or "&" can't break the markup); a nested html`` or raw("…") goes in as it is; a list is joined; null,
// undefined and false leave nothing. The result is { html } — a widget turns it into elements.
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = s => String(s).replace(/[&<>"']/g, c => ESC[c]);
const part = v =>
  v == null || v === false ? ""
  : Array.isArray(v) ? v.map(part).join("")
  : typeof v === "object" && "html" in v ? v.html
  : escape(v);

export const raw  = s => ({ html: String(s) });
// A template may run across lines: whitespace with a line break in it goes (as in JSX), a space on a line stays;
// a line break meant for the text (a title's) goes in as a value: title="${`a\nb`}"
const tight = s => s.replace(/\s*\n\s*/g, "");
export const html = (strings, ...values) =>
  ({ html: strings.reduce((out, s, i) => out + tight(s) + (i < values.length ? part(values[i]) : ""), "") });

// a BEM class with its modifiers: bem("winx-cal__day", { today: d === today }) → "winx-cal__day winx-cal__day--today"
export const bem = (base, mods = {}) =>
  [base, ...Object.entries(mods).filter(([, on]) => on).map(([m]) => `${base}--${m}`)].join(" ");
