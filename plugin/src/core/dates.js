// Dates as "YYYY-MM-DD" strings, weekdays ISO 1 = Monday … 7 = Sunday. Math in UTC (tested by tests/logic.test.mjs).
// today / ymd / pageDay read Obsidian's moment and Dataview's dates: only called inside Obsidian.
const DAY_MS = 86400000;
const toMs   = date => Date.parse(date + "T00:00:00Z");
const fromMs = ms => new Date(ms).toISOString().slice(0, 10);

export const addDays  = (date, n) => fromMs(toMs(date) + n * DAY_MS);
export const diffDays = (a, b) => Math.round((toMs(a) - toMs(b)) / DAY_MS);
export const weekday  = date => new Date(toMs(date)).getUTCDay() || 7;
export const weekOf   = date => {
  const monday = addDays(date, 1 - weekday(date));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

// n months after date; day of month clamps to the month's end (Jan 31 + 1 → Feb 28).
export const addMonths = (date, n, day = +date.slice(8, 10)) => {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1 + n, 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};

// Days shown for a month view: full Mon–Sun weeks covering the month of `date`.
export const monthGrid = date => {
  const first = date.slice(0, 8) + "01", last = addDays(addMonths(first, 1), -1);
  const out = [];
  for (let d = weekOf(first)[0]; d <= weekOf(last)[6]; d = addDays(d, 1)) out.push(d);
  return out;
};

export const dm = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;   // "08.06"

// todayYmd: today as "YYYY-MM-DD"; a Dataview (Luxon) date the same way (undefined stays undefined);
// the day a page is about: its `date` property, else today (Luxon, for .minus/.plus)
export const todayYmd = () => window.moment().format("YYYY-MM-DD");
export const ymd     = d => d?.toFormat("yyyy-MM-dd");
export const pageDay = dv => dv.current().date ?? dv.date("today");
