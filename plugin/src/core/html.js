// Markup in backticks: html`<div class="winx-weight">${kg} kg</div>`. Every value put in is escaped (a task with
// "<" or "&" can't break the markup); a nested html`` or raw("…") goes in as it is; a list is joined; null,
// undefined and false leave nothing. The result is { html } — a widget turns it into elements.
const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const escape = s => String(s).replace(/[&<>"']/g, c => ESC[c]);
const part = v => v == null || v === false ? "" : Array.isArray(v) ? v.map(part).join("") : typeof v === "object" && "html" in v ? v.html : escape(v);

export const raw  = s => ({ html: String(s) });
export const html = (strings, ...values) => ({ html: strings.reduce((out, s, i) => out + s + (i < values.length ? part(values[i]) : ""), "") });
