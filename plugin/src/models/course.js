// A medication course's table (the lines of its ```winx meds block): the columns (a medicine's
// code and its time of day), a row per day (a mark per column, a note), and the data a block
// draws from it: names by code, each day's label and whether it's past, today or to come, today's
// doses by anchor (the time of day), the counts; a mark set into a cell; the marks carried into a
// course rebuilt (the course edited), and the note's hand-written parts kept. Pure
// (tests/course.test.mjs).
import { weekday } from "#/helpers/dates.js";

export const MARKS = ["☐", "✅", "❌"];

export const next = mark => MARKS[(MARKS.indexOf(mark) + 1) % MARKS.length];
const TIMES = { "☀️": "☀️ утро", "🌤": "🌤 днём", "🌙": "🌙 на ночь", "": "в любое время" };
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export const dayLabel = date =>
  `${+date.slice(8, 10)} ${MONTHS[+date.slice(5, 7) - 1]}, ${DAYS[weekday(date) - 1]}`;

const cells = line => line.split("|").slice(1, -1).map(c => c.trim());

export function parseCourse(text) {
  const lines = text.split("\n").filter(l => l.trim().startsWith("|"));
  const head = lines.length ? cells(lines[0]).slice(1, -1) : [];
  const columns = head.map(h => {
    const time = Object.keys(TIMES).find(t => t && h.endsWith(t)) ?? "";

    return { code: time ? h.slice(0, -time.length) : h, time };
  });
  const rows = lines.map(cells).filter(c => /^\d{4}-\d\d-\d\d$/.test(c[0])).map(c => ({
    date: c[0], marks: c.slice(1, columns.length + 1), note: c[columns.length + 1] ?? "",
  }));

  return { columns, rows };
}

// the text with the date's row's cell of column `col` (0: the first medicine; the columns' count:
// the note) set to `value`, a mark or a note's text (the padding kept; an empty cell gets one space
// each side)
export const tick = (text, date, col, value) => text.split("\n").map(line => {
  if (!new RegExp(`^\\|\\s*${date}\\s*\\|`).test(line)) return line;
  const parts = line.split("|"), i = col + 2;

  parts[i] = /\S/.test(parts[i]) ? parts[i].replace(/\S(.*\S)?/, () => value) : ` ${value} `;
  return parts.join("|");
}).join("\n");

export function courseData(text, names, today) {
  const { columns, rows } = parseCourse(text);
  const cols = columns.map(c => ({ ...c, name: names[c.code] ?? c.code }));
  const days = rows.map(r => ({
    ...r, label: dayLabel(r.date),
    when: r.date < today ? "past" : r.date === today ? "today" : "future",
  }));
  const at = days.findIndex(r => r.when === "today");
  const now = days[at];
  const groups = now && Object.entries(TIMES).map(([time, label]) => ({
    label,
    items: cols.flatMap((c, col) =>
      c.time === time && now.marks[col] ? [{ col, name: c.name, mark: now.marks[col] }] : []),
  })).filter(g => g.items.length);
  const gone = days.filter(r => r.when !== "future").flatMap(r => r.marks).filter(Boolean);

  return {
    columns: cols, rows: days, today: groups || null,
    day: at >= 0 ? at + 1 : days.filter(r => r.when === "past").length && days.length + 1,
    days: days.length, taken: gone.filter(m => m === "✅").length, due: gone.length,
  };
}

// the marks and the days' notes of `from` (a course's text) set into `into` (the course rebuilt):
// by date and column (a code and its time); a day or a column gone takes them along
export function carry(from, into) {
  const old = parseCourse(from), { columns, rows } = parseCourse(into);
  const key = c => c.code + c.time;
  const at = Object.fromEntries(old.columns.map((c, i) => [key(c), i]));
  let text = into;

  for (const r of rows) {
    const was = old.rows.find(o => o.date === r.date);

    if (!was) continue;
    columns.forEach((c, i) => {
      const mark = at[key(c)] === undefined ? "" : was.marks[at[key(c)]];

      if (mark && r.marks[i]) text = tick(text, r.date, i, mark);
    });
    if (was.note) text = tick(text, r.date, columns.length, was.note);
  }

  return text;
}

// the note rebuilt: `fresh` (its properties and the pieces Winx writes: the Приём, Заметки and
// Легенда cards, the block), then whatever else `old` had, written by hand
const MADE = /^(> \[!card\] (Приём|Заметки|Легенда)(\n|$)|```winx)/;
const body = text => text.slice(text.indexOf("\n---\n", 3) + 5).trim();

export const rebuild = (old, fresh) => {
  const kept = body(old).split(/\n{2,}/).filter(b => b && !MADE.test(b));

  return [fresh.trimEnd(), ...kept].join("\n\n") + "\n";
};
