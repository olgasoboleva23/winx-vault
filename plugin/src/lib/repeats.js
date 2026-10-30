// 🔁 rules of the Tasks plugin: their future dates and their short words (tested by tests/lib.test.mjs).
import { addDays, addMonths, diffDays, weekOf, weekday } from "./dates.js";

// A 🔁 rule in short words: "every 3 days when done" → "every 3 days after done", weekdays → "Mon · Wed · Fri"
// (+ " after done" for "when done"); an unknown rule comes back as written.
export const ruleText = rule => {
  const r = rule.trim(), base = r.replace(/\s*when done$/, ""), after = base !== r;
  let m;
  const text = (m = base.match(/^every week on (.+)$/)) ? m[1].split(/,\s*|\s+and\s+/).map(d => d.slice(0, 3)).join(" · ")
    : (m = base.match(/^every (\d+) (day|week|month|year)s?$/)) ? `every ${m[1]} ${m[2]}s`
    : (m = base.match(/^every (day|week|month|year)$/)) ? (m[1] === "day" ? "daily" : `${m[1]}ly`)
    : (m = base.match(/^every month on the (\w+)$/)) ? `monthly, the ${m[1]}`
    : base;
  return after ? `${text} after done` : text;
};

const WEEKDAYS_EN = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Future dates of a Tasks 🔁 rule after `from` (the open instance's date), up to `until`.
// Covers every [N] day/week/month/year, "on Monday, …", "on the 1st"; "when done" is
// projected from `from`. Unknown rules give [].
export const projectRepeats = (rule, from, until) => {
  const m = rule.trim().match(/^every (?:(\d+) )?(day|week|month|year)s?(?: on (.+?))?(?: when done)?$/i);
  if (!m) return [];
  const n = +(m[1] ?? 1), unit = m[2].toLowerCase(), on = m[3]?.toLowerCase() ?? "";
  const out = [];
  if (unit === "week" && on) {
    const days = WEEKDAYS_EN.map((d, i) => on.includes(d) ? i + 1 : 0).filter(Boolean);
    const start = weekOf(from)[0];
    for (let d = addDays(from, 1); d <= until; d = addDays(d, 1))
      if (days.includes(weekday(d)) && Math.floor(diffDays(d, start) / 7) % n === 0) out.push(d);
    return out;
  }
  const dom = on.match(/(\d+)/) ? +on.match(/(\d+)/)[1] : +from.slice(8, 10);
  for (let k = 1; k < 1000; k++) {
    const d = unit === "day" ? addDays(from, k * n)
      : unit === "week" ? addDays(from, 7 * k * n)
      : addMonths(from, k * n * (unit === "year" ? 12 : 1), dom);
    if (d > until) break;
    out.push(d);
  }
  return out;
};
