// Pure goal / week / cycle logic, no Obsidian globals (tested by tests/goalsLib.test.mjs).
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
const DAY_NAMES_EN = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// Goal list item from Goals.md (Shop.md format): "name:: …" plus continuation lines.
const parseGoal = function (text) {
  const field = k => text.match(new RegExp(`(?:^|\\s)${k}::[ \\t]*(.*)`, "m"))?.[1].trim() || null;
  const name = field("name"), tag = field("tag");
  if (!name || !tag) return null;
  const daysRaw = field("days");
  const days = daysRaw
    ? daysRaw.toLowerCase().split(/[,\s]+/).map(d => (DAY_NAMES.indexOf(d) + 1) || (DAY_NAMES_EN.indexOf(d.slice(0, 3)) + 1)).filter(Boolean)
    : null;
  const perWeek = days ? null : Number(field("perWeek")) || null;
  return { name, tag, days, perWeek, min: field("min"), plan: field("plan"), remind: field("remind") ?? "18:00" };
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

// Staples from purchase history: anything bought at least twice.
// history: [{name, tag, date}] of completed market items. A forecast (avg days
// between buys) needs 3+ buys; due when 85% of the usual interval has passed.
const supplyStats = function (history, today) {
  const by = {};
  for (const h of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = h.name.trim().toLowerCase();
    (by[key] ??= { name: key, dates: [], tag: h.tag }).dates.push(h.date);
    by[key].tag = h.tag;
  }
  return Object.values(by).filter(x => x.dates.length >= 2).sort((a, b) => a.name.localeCompare(b.name)).map(x => {
    const gaps  = x.dates.slice(1).map((d, i) => diffDays(d, x.dates[i]));
    const avg   = x.dates.length >= 3 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    const since = diffDays(today, x.dates.at(-1));
    return { name: x.name, tag: x.tag, buys: x.dates.length, avg, since, due: avg !== null && since >= avg * 0.85 };
  });
};

// Today's notifications from open tasks due today. A goal task fires at the
// goal's remind time with its plan; a task with "HH:MM" in its text fires
// 30 minutes before. Sorted by time.
const reminders = function (tasks, goals) {
  const out = [];
  for (const t of tasks) {
    const goal = goals.find(g => t.tags.includes(g.tag));
    if (goal) { out.push({ at: goal.remind, title: goal.name, body: goal.plan || goal.min || goal.name }); continue; }
    const m = t.text.match(/(?:^|\s)(\d{1,2}):(\d{2})(?!\d)/);
    if (!m) continue;
    const mins = Math.max(0, Number(m[1]) * 60 + Number(m[2]) - 30);
    const at = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    out.push({ at, title: "In 30 minutes", body: t.text.replace(/#[^\s]+/g, "").trim() });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
};

// Mark an open market line as bought today, the way the Tasks plugin does.
// Lines that are not open tasks come back unchanged.
const markBought = (line, date) =>
  /^\s*- \[ \]/.test(line) ? `${line.replace("- [ ]", "- [x]").trimEnd()} ✅ ${date}` : line;

// Undo markBought: reopen a bought line and drop its ✅ date.
const unmarkBought = line =>
  /^\s*- \[x\]/i.test(line) ? line.replace(/- \[x\]/i, "- [ ]").replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/u, "").trimEnd() : line;

// How many things are on today's plate, same rules as the old Kanban2 Today column:
// picked for today (⏳ today), routines due by today, deadlines due by today.
// tasks: [{done, recurring, due?, scheduled?}] with "YYYY-MM-DD" dates.
const todayCount = (tasks, date) => tasks.filter(t => !t.done && (
  t.recurring ? (t.due ?? t.scheduled) !== undefined && (t.due ?? t.scheduled) <= date
              : t.scheduled === date || (t.due !== undefined && t.due <= date)
)).length;

// Weight log lines: "- YYYY-MM-DD 70.5" (comma decimals accepted). Sorted by date.
const WEIGHT_LINE = /^- (\d{4}-\d{2}-\d{2}) (\d+(?:[.,]\d+)?)\s*$/;
const parseWeights = text => text.split("\n")
  .map(l => l.trim().match(WEIGHT_LINE)).filter(Boolean)
  .map(m => ({ date: m[1], kg: Number(m[2].replace(",", ".")) }))
  .sort((a, b) => a.date.localeCompare(b.date));

// Set the weight for a day: replace that day's line or append a new one.
const upsertWeight = (text, date, kg) => {
  const line = `- ${date} ${kg}`;
  const lines = text.replace(/\s+$/, "").split("\n").filter((l, i, a) => !(a.length === 1 && l === ""));
  const i = lines.findIndex(l => l.trim().match(WEIGHT_LINE)?.[1] === date);
  if (i >= 0) lines[i] = line; else lines.push(line);
  return lines.join("\n") + "\n";
};

// Level from total XP: level n costs base + (n-1)*step XP; progress is what's left over.
const levelInfo = (total, base = 100, step = 25) => {
  let left = total;
  for (let level = 1; ; level++) {
    const cost = base + (level - 1) * step;
    if (left < cost) return { level, progress: left, cost };
    left -= cost;
  }
};

// A 🔁 rule in short words: "every 3 days when done" → "every 3 days after done", weekdays → "Mon · Wed · Fri"
// (+ " after done" for "when done"); an unknown rule comes back as written.
const ruleText = rule => {
  const r = rule.trim(), base = r.replace(/\s*when done$/, ""), after = base !== r;
  let m;
  const text = (m = base.match(/^every week on (.+)$/)) ? m[1].split(/,\s*|\s+and\s+/).map(d => d.slice(0, 3)).join(" · ")
    : (m = base.match(/^every (\d+) (day|week|month|year)s?$/)) ? `every ${m[1]} ${m[2]}s`
    : (m = base.match(/^every (day|week|month|year)$/)) ? (m[1] === "day" ? "daily" : `${m[1]}ly`)
    : (m = base.match(/^every month on the (\w+)$/)) ? `monthly, the ${m[1]}`
    : base;
  return after ? `${text} after done` : text;
};

// ── Calendar ──
// n months after date; day of month clamps to the month's end (Jan 31 + 1 → Feb 28).
const addMonths = (date, n, day = +date.slice(8, 10)) => {
  const d = new Date(Date.UTC(+date.slice(0, 4), +date.slice(5, 7) - 1 + n, 1));
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate();
  d.setUTCDate(Math.min(day, last));
  return d.toISOString().slice(0, 10);
};
const WEEKDAYS_EN = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

// Future dates of a Tasks 🔁 rule after `from` (the open instance's date), up to `until`.
// Covers every [N] day/week/month/year, "on Monday, …", "on the 1st"; "when done" is
// projected from `from`. Unknown rules give [].
const projectRepeats = (rule, from, until) => {
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

// Days shown for a month view: full Mon–Sun weeks covering the month of `date`.
const monthGrid = date => {
  const first = date.slice(0, 8) + "01", last = addDays(addMonths(first, 1), -1);
  const out = [];
  for (let d = weekOf(first)[0]; d <= weekOf(last)[6]; d = addDays(d, 1)) out.push(d);
  return out;
};


export const L = { addMonths, projectRepeats, monthGrid, weekOf, weekday, addDays, parseGoal, weeklyTarget, countDone, dayStatus, nextPlannedDate, rollDue, cycleInfo, supplyStats, reminders, markBought, unmarkBought, todayCount, parseWeights, upsertWeight, ruleText, levelInfo, diffDays };
