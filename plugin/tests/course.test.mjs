import { test } from "node:test";
import assert from "node:assert/strict";
import { carry, courseData, dayLabel, next, parseCourse, rebuild, tick } from "#/models/course.js";

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

test("courseData: names by code, the rows' labels and when, today's groups by anchor, the counts", () => {
  const d = courseData(TABLE, { "БА": "баксет феминик", "МА": "мастодинон" }, "2026-11-08");

  assert.deepEqual(d.columns.map(c => c.name), ["баксет феминик", "мастодинон", "мастодинон", "АЕ"]);
  assert.deepEqual(d.rows.map(r => [r.label, r.when]), [["7 ноя, сб", "past"], ["8 ноя, вс", "today"], ["9 ноя, пн", "future"]]);
  assert.deepEqual(d.today, [
    { label: "☀️ утро", items: [{ col: 1, name: "мастодинон", mark: "✅" }] },
    { label: "🌙 на ночь", items: [{ col: 2, name: "мастодинон", mark: "☐" }] },
    { label: "в любое время", items: [{ col: 0, name: "баксет феминик", mark: "✅" }, { col: 3, name: "АЕ", mark: "❌" }] },
  ]);
  assert.deepEqual([d.day, d.days, d.taken, d.due], [2, 3, 6, 8]);
  // a day before the course, or after it: no "today" groups, the day count says so
  assert.equal(courseData(TABLE, {}, "2026-11-01").today, null);
  assert.deepEqual([courseData(TABLE, {}, "2026-11-01").day, courseData(TABLE, {}, "2026-12-01").day], [0, 4]);
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
