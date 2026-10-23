// Pure goal / week / cycle logic, no Obsidian globals (tested by tests/goalsLib.test.mjs).
// Widgets load it like helpers.js:
//   const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));
// Dates are "YYYY-MM-DD" strings, weekdays ISO 1 = Monday … 7 = Sunday. Math in UTC.
const DAY_MS = 86400000;
const toMs   = date => Date.parse(date + "T00:00:00Z");
const fromMs = ms => new Date(ms).toISOString().slice(0, 10);

const addDays = (date, n) => fromMs(toMs(date) + n * DAY_MS);
const diffDays = (a, b) => Math.round((toMs(a) - toMs(b)) / DAY_MS);
const weekday = date => new Date(toMs(date)).getUTCDay() || 7;
const weekOf = date => {
  const monday = addDays(date, 1 - weekday(date));
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
};

const DAY_NAMES = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

// Goal list item from Goals.md (Shop.md format): "name:: …" plus continuation lines.
const parseGoal = function (text) {
  const field = k => text.match(new RegExp(`(?:^|\\s)${k}::[ \\t]*(.*)`, "m"))?.[1].trim() || null;
  const name = field("name"), tag = field("tag");
  if (!name || !tag) return null;
  const daysRaw = field("days");
  const days = daysRaw
    ? daysRaw.toLowerCase().split(/[,\s]+/).map(d => DAY_NAMES.indexOf(d) + 1).filter(Boolean)
    : null;
  const perWeek = days ? null : Number(field("perWeek")) || null;
  return { name, tag, days, perWeek, min: field("min"), plan: field("plan") };
};

const weeklyTarget = goal => goal.days?.length ?? goal.perWeek ?? 0;

const countDone = (doneDates, week) => new Set(doneDates.filter(d => week.includes(d))).size;

const dayStatus = function (goal, date, doneSet, today) {
  if (doneSet.has(date)) return "done";
  if (goal.days?.includes(weekday(date))) return date < today ? "missed" : "planned";
  return "none";
};

const nextPlannedDate = function (goal, from) {
  if (!goal.days?.length) return from;
  for (let i = 0; ; i++) if (goal.days.includes(weekday(addDays(from, i)))) return addDays(from, i);
};

// Replace "📅 oldDate" with "📅 newDate" on a task line; unchanged if absent.
const rollDue = (line, oldDate, newDate) => line.replace(`📅 ${oldDate}`, `📅 ${newDate}`);

// ends: recorded last days of a period. The end of a cycle is the first end
// between its start and the next start. Without one, the period lasts the
// average of the last 6 recorded lengths, or `period` days if none.
const cycleInfo = function (starts, date, period = 8, ends = []) {
  const all  = [...starts].sort();
  const past = all.filter(s => s <= date);
  if (!past.length) return null;
  const endOf = (s, i) => ends.filter(e => e >= s && (all[i + 1] === undefined || e < all[i + 1])).sort()[0];
  const recent = past.slice(-7);
  const gaps = recent.slice(1).map((s, i) => diffDays(s, recent[i]));
  const length = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 30;
  const lens = all.map((s, i) => [s, endOf(s, i)]).filter(([s, e]) => e && s < past.at(-1))
    .slice(-6).map(([s, e]) => diffDays(e, s) + 1);
  const usual = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : period;
  const last = past.at(-1);
  const end  = endOf(last, all.indexOf(last));
  const day  = diffDays(date, last) + 1;
  const nextStart = addDays(last, length);
  return {
    day, length, nextStart, daysUntil: diffDays(nextStart, date),
    isPeriod: end ? date <= end : day <= usual,
    ended: !!end && end <= date,
  };
};

({ weekOf, weekday, addDays, parseGoal, weeklyTarget, countDone, dayStatus, nextPlannedDate, rollDue, cycleInfo })
