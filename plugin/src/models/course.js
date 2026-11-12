// A medication course: a record of courses.json ({ start, meds, notes, marks: { date: { key:
// mark } }, dayNotes: { date: text } }, a key a medicine's code and its time of day) and what is
// derived from it: the columns, a row per day (☐ a due key with no mark, blank past a medicine's
// days), today's doses by time of day, the counts, the Приём lines, the window's form and values;
// a mark or a day's note set (a new record). Until the move to courses.json, the old table too
// (the lines of a note's ```winx meds block): parsed, ticked, carried into a course rebuilt, the
// note's hand-written parts kept. Pure (tests/course.test.mjs).
import { addDays, weekday } from "#/helpers/dates.js";

export const MARKS = ["☐", "✅", "❌"];

export const next = mark => MARKS[(MARKS.indexOf(mark) + 1) % MARKS.length];

export const TIMES = { "☀️": "☀️ утро", "🌤": "🌤 днём", "🌙": "🌙 на ночь", "": "в любое время" };
const MONTHS = ["янв", "фев", "мар", "апр", "мая", "июн", "июл", "авг", "сен", "окт", "ноя", "дек"];
const DAYS = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];

export const dayLabel = date =>
  `${+date.slice(8, 10)} ${MONTHS[+date.slice(5, 7) - 1]}, ${DAYS[weekday(date) - 1]}`;

// the medicines of a course, a group each in the window: the name, the dose ("30 капель"; none:
// the words from the first number of the name), when (morning | both | day | evening | any: once a
// day), the meal (before | after | sleep | any), days
const WHEN = { morning: ["☀️"], both: ["☀️", "🌙"], day: ["🌤"], evening: ["🌙"], any: [] };
const MEAL_TEXT = { before: "перед едой", after: "после еды", sleep: "перед сном" };
const MEALS = [...Object.values(MEAL_TEXT), ""];
const pairs = list => list.map(([label, value]) => ({ label, value }));

// a name as typed may carry the dose ("Мастодинон 30 капель"): the words before its first number
const parts = typed => {
  const words = typed.trim().split(/\s+/), at = words.findIndex(w => /^\d/.test(w));

  return at < 0 ? [words.join(" "), ""] : [words.slice(0, at).join(" "), words.slice(at).join(" ")];
};

export const nameOf = typed => parts(typed)[0];

export const codeOf = typed => nameOf(typed).slice(0, 2).toUpperCase();

// a code per medicine, its column's name, the key its marks follow through an edit: kept once it
// has one (a rename or a new order keeps it), else free letters of its name (Мастодинон МА,
// Магний МГ), else a number
export const withCodes = groups => {
  const taken = new Set(groups.map(g => g.code).filter(Boolean));

  return groups.map(g => {
    if (g.code) return g;
    const n = nameOf(g.name).toUpperCase().replace(/[^\p{L}\p{N}]/gu, "");
    const tries = [...n.slice(1)].map(c => n[0] + c)
      .concat(Array.from({ length: 9 }, (_, i) => n.slice(0, 2) + (i + 2)));
    const code = tries.find(c => !taken.has(c)) ?? n.slice(0, 2);

    taken.add(code);
    return { ...g, code };
  });
};

export const medicine = g => {
  const [name, dose] = parts(g.name);

  return {
    name, dose: g.dose?.trim() || dose, times: WHEN[g.times] ?? [],
    meal: MEAL_TEXT[g.meal] ?? "", days: Number(g.days) || 90, code: g.code,
  };
};

// the window of a course, a group per medicine (+ adds one)
export const courseForm = () => ({
  rows: [
    {
      name: "Medicines", key: "meds", required: ["name"],
      list: [
        { name: "Name", key: "name", text: "Мастодинон" },
        { name: "Dose", key: "dose", text: "30 капель" },
        {
          name: "When", key: "times",
          options: pairs([
            ["утром", "morning"], ["утром и вечером", "both"], ["днём", "day"],
            ["вечером", "evening"], ["неважно", "any"],
          ]),
        },
        {
          name: "Meal", key: "meal",
          options: pairs([
            ["перед едой", "before"], ["после еды", "after"], ["перед сном", "sleep"],
            ["неважно", "any"],
          ]),
        },
        { name: "Days", key: "days", text: "90", number: true },
      ],
    },
    { name: "Start", key: "start", text: "YYYY-MM-DD (empty: today)" },
    {
      name: "Notes", key: "notes", text: "доп. информация: от врача, как принимать…",
      lines: true,
    },
  ],
  values: {}, required: ["meds"],
});

// the medicines as the record keeps them: as typed, a code each
const normal = meds => withCodes(meds).map(g => ({
  name: g.name, code: g.code, dose: g.dose ?? "", times: g.times ?? "any",
  meal: g.meal ?? "any", days: Number(g.days) || 90,
}));

export const courseOf = (v, today) => ({
  start: v.start?.trim() || today, meds: normal(v.meds), notes: v.notes?.trim() ?? "",
  marks: {}, dayNotes: {},
});

export const edited = (rec, v) => ({
  ...rec, start: v.start?.trim() || rec.start, meds: normal(v.meds), notes: v.notes?.trim() ?? "",
});

export const formValues = rec =>
  ({ meds: rec.meds.map(g => ({ ...g })), start: rec.start, notes: rec.notes });

// a column per medicine and time of day (once a day: no time), its key the marks are kept by
export const columns = meds => meds.flatMap(m => {
  const times = WHEN[m.times]?.length ? WHEN[m.times] : [""];

  return times.map(time => ({
    key: m.code + time, code: m.code, time, name: nameOf(m.name), days: Number(m.days) || 90,
  }));
});

export const courseDays = rec => Math.max(...columns(rec.meds).map(c => c.days));

export const courseName = rec => rec.meds.map(m => nameOf(m.name)).join(", ");

export const isRunning = (rec, today) =>
  rec.start <= today && today < addDays(rec.start, courseDays(rec));

// the day by its anchors (a time of day, a meal): what to take then, the doses
export const intake = meds => {
  const cols = meds.map(medicine)
    .flatMap(m => (m.times.length ? m.times : [""]).map(t => ({ m, t })));

  return Object.keys(TIMES).flatMap(t => MEALS.map(meal => {
    const take = cols.filter(c => c.t === t && c.m.meal === meal)
      .map(c => [c.m.name, c.m.dose].filter(Boolean).join(" "));

    return take.length ? `${[TIMES[t], meal].filter(Boolean).join(", ")}: ${take.join(", ")}` : "";
  })).filter(Boolean);
};

// what the block draws: a row per day from the start (a key the columns no longer have isn't
// shown or counted), the day of the course (0: before it; days + 1: after), today's doses
export function courseData(rec, today) {
  const cols = columns(rec.meds), days = courseDays(rec);
  const rows = Array.from({ length: days }, (_, i) => {
    const date = addDays(rec.start, i);

    return {
      date, label: dayLabel(date),
      when: date < today ? "past" : date === today ? "today" : "future",
      marks: cols.map(c => i < c.days ? rec.marks[date]?.[c.key] ?? "☐" : ""),
      note: rec.dayNotes[date] ?? "",
    };
  });
  const at = rows.findIndex(r => r.when === "today"), now = rows[at];
  const groups = now && Object.entries(TIMES).map(([time, label]) => ({
    label,
    items: cols.flatMap((c, col) => c.time === time && now.marks[col]
      ? [{ col, key: c.key, name: c.name, mark: now.marks[col] }] : []),
  })).filter(g => g.items.length);
  const gone = rows.filter(r => r.when !== "future").flatMap(r => r.marks).filter(Boolean);

  return {
    columns: cols.map(({ days: _, ...c }) => c), rows, today: groups || null,
    day: at >= 0 ? at + 1 : rows[0].when === "past" ? days + 1 : 0,
    days, taken: gone.filter(m => m === "✅").length, due: gone.length,
  };
}

// a copy of `obj` with `key` set to `value`, or without it (`value` undefined)
const put = (obj = {}, key, value) => {
  const copy = { ...obj };

  if (value === undefined) delete copy[key];
  else copy[key] = value;
  return copy;
};

export const withMark = (rec, date, key, mark) => {
  const day = put(rec.marks[date], key, mark === "☐" ? undefined : mark);

  return { ...rec, marks: put(rec.marks, date, Object.keys(day).length ? day : undefined) };
};

export const withDayNote = (rec, date, text) =>
  ({ ...rec, dayNotes: put(rec.dayNotes, date, text.trim() || undefined) });

// the food page's view of a course: its medicines and by day the codes taken (a ✅ in any of
// their keys)
export function forFood(id, rec) {
  const code = Object.fromEntries(columns(rec.meds).map(c => [c.key, c.code]));

  return {
    id, name: courseName(rec), start: rec.start, days: courseDays(rec),
    meds: rec.meds.map(m => ({ code: m.code, name: nameOf(m.name), days: Number(m.days) || 90 })),
    taken: new Map(Object.entries(rec.marks).map(([date, marks]) => [date,
      new Set(Object.keys(marks).filter(k => marks[k] === "✅" && code[k]).map(k => code[k]))])),
  };
}

// the courses for the tabs: running first, then the newest start
export const courseList = (json, today) => Object.entries(json)
  .map(([id, rec]) => ({
    id, name: courseName(rec), start: rec.start,
    label: `${courseName(rec)} · ${dayLabel(rec.start).split(",")[0]}`,
    running: isRunning(rec, today),
  }))
  .sort((a, b) => b.running - a.running || b.start.localeCompare(a.start));

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

export function tableData(text, names, today) {
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
// Легенда cards: the last one from notes made before the block drew the legend, the block), then
// whatever else `old` had, written by hand
const MADE = /^(> \[!card\] (Приём|Заметки|Легенда)(\n|$)|```winx)/;
const body = text => text.slice(text.indexOf("\n---\n", 3) + 5).trim();

export const rebuild = (old, fresh) => {
  const kept = body(old).split(/\n{2,}/).filter(b => b && !MADE.test(b));

  return [fresh.trimEnd(), ...kept].join("\n\n") + "\n";
};
