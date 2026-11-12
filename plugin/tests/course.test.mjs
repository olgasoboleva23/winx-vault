import { test } from "node:test";
import assert from "node:assert/strict";
import {
  carry, columns, courseData, courseForm, courseList, courseOf, dayLabel, edited, forFood, intake, next,
  parseCourse, rebuild, tableData, tick, withDayNote, withMark,
} from "#/models/course.js";

const TABLE = `| Дата | БА | МА☀️ | МА🌙 | АЕ | Заметки |
| --- | :-: | :-: | :-: | :-: | --- |
| 2026-11-07 | ✅ | ✅ | ✅ | ✅ |  |
| 2026-11-08 | ✅ | ✅ | ☐ | ❌ | сегодня |
| 2026-11-09 |  | ☐ | ☐ | ☐ |  |`;

test("a mark goes round ☐ → ✅ → ❌ → ☐; a day's label in Russian", () => {
  assert.deepEqual(["☐", "✅", "❌"].map(next), ["✅", "❌", "☐"]);
  assert.equal(dayLabel("2026-11-08"), "8 ноя, вс");
  assert.equal(dayLabel("2027-02-04"), "4 фев, чт");
});

test("parseCourse: the columns (a code and its time of day) and a row per day (its marks, its note)", () => {
  const { columns, rows } = parseCourse(TABLE);

  assert.deepEqual(columns, [
    { code: "БА", time: "" }, { code: "МА", time: "☀️" }, { code: "МА", time: "🌙" }, { code: "АЕ", time: "" },
  ]);
  assert.deepEqual(rows[1], { date: "2026-11-08", marks: ["✅", "✅", "☐", "❌"], note: "сегодня" });
  assert.deepEqual(rows[2].marks, ["", "☐", "☐", "☐"]);
});

test("tick: the date's row gets the mark in the column's cell, padding kept; other lines stay", () => {
  const padded = "| 2026-11-08 |  ✅  |  ☐   |\n| 2026-11-09 | ☐ | ☐ |";

  assert.equal(tick(padded, "2026-11-08", 1, "✅"), "| 2026-11-08 |  ✅  |  ✅   |\n| 2026-11-09 | ☐ | ☐ |");
  assert.equal(tick(padded, "2026-11-09", 0, "❌"), "| 2026-11-08 |  ✅  |  ☐   |\n| 2026-11-09 | ❌ | ☐ |");
  assert.equal(tick(padded, "2026-11-10", 0, "✅"), padded);
  // a note: the whole cell, an empty one gets a space each side
  const noted = "| 2026-11-08 | ☐ | после обеда |\n| 2026-11-09 | ☐ |  |";

  assert.equal(tick(noted, "2026-11-08", 1, "пропустила, поездка"), "| 2026-11-08 | ☐ | пропустила, поездка |\n| 2026-11-09 | ☐ |  |");
  assert.equal(tick(noted, "2026-11-09", 1, "$ ок"), "| 2026-11-08 | ☐ | после обеда |\n| 2026-11-09 | ☐ | $ ок |");
});

test("tableData: names by code, the rows' labels and when, today's groups by anchor, the counts", () => {
  const d = tableData(TABLE, { "БА": "баксет феминик", "МА": "мастодинон" }, "2026-11-08");

  assert.deepEqual(d.columns.map(c => c.name), ["баксет феминик", "мастодинон", "мастодинон", "АЕ"]);
  assert.deepEqual(d.rows.map(r => [r.label, r.when]), [["7 ноя, сб", "past"], ["8 ноя, вс", "today"], ["9 ноя, пн", "future"]]);
  assert.deepEqual(d.today, [
    { label: "☀️ утро", items: [{ col: 1, name: "мастодинон", mark: "✅" }] },
    { label: "🌙 на ночь", items: [{ col: 2, name: "мастодинон", mark: "☐" }] },
    { label: "в любое время", items: [{ col: 0, name: "баксет феминик", mark: "✅" }, { col: 3, name: "АЕ", mark: "❌" }] },
  ]);
  assert.deepEqual([d.day, d.days, d.taken, d.due], [2, 3, 6, 8]);
  // a day before the course, or after it: no "today" groups, the day count says so
  assert.equal(tableData(TABLE, {}, "2026-11-01").today, null);
  assert.deepEqual([tableData(TABLE, {}, "2026-11-01").day, tableData(TABLE, {}, "2026-12-01").day], [0, 4]);
});

test("carry: the marks and the days' notes go into the course rebuilt, by date and column; a column gone goes with them", () => {
  const fresh = `| Дата | МА☀️ | МА🌙 | НО🌙 | Заметки |
| --- | :-: | :-: | :-: | --- |
| 2026-11-07 | ☐ | ☐ | ☐ |  |
| 2026-11-08 | ☐ | ☐ | ☐ |  |
| 2026-11-09 | ☐ | ☐ | ☐ |  |`;
  const text = carry(TABLE, fresh);   // TABLE: БА, МА☀️, МА🌙, АЕ

  assert.equal(text, `| Дата | МА☀️ | МА🌙 | НО🌙 | Заметки |
| --- | :-: | :-: | :-: | --- |
| 2026-11-07 | ✅ | ✅ | ☐ |  |
| 2026-11-08 | ✅ | ☐ | ☐ | сегодня |
| 2026-11-09 | ☐ | ☐ | ☐ |  |`);
});

test("rebuild: the note's generated pieces are the fresh ones, what was written by hand stays after them", () => {
  const old = `---
type: meds
---

> [!card] Приём
> - ☀️ утро: а

> [!card] Заметки
> старое

> [!card] Легенда
> | Код | Препарат |

\`\`\`winx
meds
| Дата | А |
\`\`\`

> [!card] От врача
> не запивать молоком

просто абзац
`;
  const fresh = `---
type: meds
days: 2
---

> [!card] Приём
> - ☀️ утро: а, б

> [!card] Легенда
> | Код | Препарат |

\`\`\`winx
meds
| Дата | А | Б |
\`\`\`
`;

  assert.equal(rebuild(old, fresh), `---
type: meds
days: 2
---

> [!card] Приём
> - ☀️ утро: а, б

> [!card] Легенда
> | Код | Препарат |

\`\`\`winx
meds
| Дата | А | Б |
\`\`\`

> [!card] От врача
> не запивать молоком

просто абзац
`);
});

// a course as a record (courses.json): made-up medicines, two days ticked, a stray key
const REC = {
  start: "2026-11-07",
  meds: [
    { name: "Аевит", code: "АЕ", dose: "1 таблетка", times: "any", meal: "after", days: 2 },
    { name: "Магний 2 таблетки", code: "МГ", dose: "", times: "both", meal: "before", days: 3 },
  ],
  notes: "",
  marks: {
    "2026-11-07": { "АЕ": "✅", "МГ☀️": "✅", "МГ🌙": "❌" },
    "2026-11-08": { "МГ☀️": "✅", "ХХ": "✅" },
  },
  dayNotes: { "2026-11-08": "сегодня" },
};

test("a record's course: a column per medicine and time, a row per day, today's groups, counts", () => {
  assert.deepEqual(columns(REC.meds).map(c => c.key), ["АЕ", "МГ☀️", "МГ🌙"]);
  const d = courseData(REC, "2026-11-08");

  assert.equal(d.rows.length, 3);
  assert.deepEqual(d.rows[2].marks, ["", "☐", "☐"]);   // Аевит's 2 days are over
  assert.deepEqual(d.rows[1].marks, ["☐", "✅", "☐"]);
  assert.equal(d.rows[1].note, "сегодня");
  assert.deepEqual(d.rows.map(r => r.when), ["past", "today", "future"]);
  assert.deepEqual(d.columns[1], { key: "МГ☀️", code: "МГ", time: "☀️", name: "Магний" });
  // the stray ХХ isn't counted
  assert.deepEqual([d.day, d.days, d.taken, d.due], [2, 3, 3, 6]);
  assert.deepEqual(d.today.map(g => g.label), ["☀️ утро", "🌙 на ночь", "в любое время"]);
  assert.deepEqual(d.today[0].items, [{ col: 1, key: "МГ☀️", name: "Магний", mark: "✅" }]);
  // before and after the course
  assert.deepEqual([courseData(REC, "2026-11-01").day, courseData(REC, "2026-11-01").today], [0, null]);
  assert.deepEqual([courseData(REC, "2026-11-20").day, courseData(REC, "2026-11-20").today], [4, null]);
});

test("withMark / withDayNote: a new record; ☐ or an empty text deletes, an empty day goes", () => {
  const copy = structuredClone(REC);

  assert.deepEqual(withMark(REC, "2026-11-08", "МГ☀️", "☐").marks["2026-11-08"], { "ХХ": "✅" });
  assert.deepEqual(withMark(REC, "2026-11-09", "АЕ", "✅").marks["2026-11-09"], { "АЕ": "✅" });
  const one = withMark(REC, "2026-11-09", "АЕ", "✅");

  assert.equal("2026-11-09" in withMark(one, "2026-11-09", "АЕ", "☐").marks, false);
  assert.equal("2026-11-08" in withDayNote(REC, "2026-11-08", "  ").dayNotes, false);
  assert.equal(withDayNote(REC, "2026-11-09", " тошнило ").dayNotes["2026-11-09"], "тошнило");
  assert.deepEqual(REC, copy);
});

test("intake: the Приём lines by time of day and meal, the doses", () => {
  assert.deepEqual(intake(REC.meds), [
    "☀️ утро, перед едой: Магний 2 таблетки",
    "🌙 на ночь, перед едой: Магний 2 таблетки",
    "в любое время, после еды: Аевит 1 таблетка",
  ]);
});

test("courseOf / edited: the window's values as a record, the marks kept through an edit", () => {
  assert.deepEqual(courseOf({ meds: [{ name: "Мастодинон 30 капель" }] }, "2026-11-10"), {
    start: "2026-11-10",
    meds: [{
      name: "Мастодинон 30 капель", code: "МА", dose: "", times: "any", meal: "any", days: 90,
    }],
    notes: "", marks: {}, dayNotes: {},
  });
  const meds = REC.meds.map(m => ({ ...m, dose: "3 капли" }));
  const rec = edited(REC, { meds, start: "", notes: "x" });

  assert.deepEqual([rec.start, rec.notes, rec.meds[0].dose], ["2026-11-07", "x", "3 капли"]);
  assert.deepEqual([rec.marks, rec.dayNotes], [REC.marks, REC.dayNotes]);
});

test("courseOf / edited: a code per medicine, unique, kept through a rename; the window's rows", () => {
  const rec = courseOf({ meds: [{ name: "Мастодинон" }, { name: "Магний" }, { name: "Масло" }] }, "2026-11-08");

  assert.deepEqual(rec.meds.map(m => m.code), ["МА", "МГ", "МС"]);
  const again = edited(rec, { meds: [{ name: "Магний цитрат", code: "МГ" }, { name: "Мастодинон", code: "МА" }, { name: "Мелатонин" }] });

  assert.deepEqual(again.meds.map(m => m.code), ["МГ", "МА", "МЕ"]);
  const { rows, required } = courseForm();

  assert.deepEqual(rows.map(r => r.key), ["meds", "start", "notes"]);
  assert.deepEqual(rows[0].list.map(r => r.key), ["name", "dose", "times", "meal", "days"]);
  assert.deepEqual([rows[0].required, required, rows[2].lines], [["name"], ["meds"], true]);
});

test("forFood: the codes taken by day; courseList: running first, then the newest", () => {
  const food = forFood("c1", REC);

  assert.deepEqual(food.taken.get("2026-11-07"), new Set(["АЕ", "МГ"]));
  assert.deepEqual([food.id, food.name, food.days], ["c1", "Аевит, Магний", 3]);
  const list = courseList({
    c1: REC, c2: { ...REC, start: "2026-11-09" }, c3: { ...REC, start: "2026-10-01" },
  }, "2026-11-08");

  assert.deepEqual(list.map(c => c.id), ["c1", "c2", "c3"]);
  assert.deepEqual(list.map(c => c.running), [true, false, false]);
  assert.equal(list[0].label, "Аевит, Магний · 7 ноя");
});
