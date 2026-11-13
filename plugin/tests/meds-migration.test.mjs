import { test } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import { Notice } from "obsidian";
import {
  checkCourse, courseFromNote, migrateMeds, migrateMedsNotes, parseCourse,
} from "#/migrations/meds.js";
import { COURSES, MEDICATION, MEDICATION_BASE } from "#/helpers/paths.js";
import { withMark } from "#/models/course.js";

globalThis.window ??= {};
window.moment = () => ({ format: () => "2026-11-08" });
const DIR = "00 System/Data/Medication", P = `${DIR}/Аевит, Магний.md`;
const MEDS = [
  { name: "Аевит", code: "АЕ", dose: "1 капсула", times: "any", meal: "any", days: 2 },
  { name: "Магний", code: "МГ", dose: "", times: "both", meal: "after", days: 3 },
];
const FM = { type: "meds", start: "2026-11-07", days: 3, meds: MEDS, notes: "**важно**" };
const NOTE = `---
type: meds
start: 2026-11-07
days: 3
meds:
  - {"name":"Аевит","code":"АЕ","dose":"1 капсула","times":"any","meal":"any","days":2}
  - {"name":"Магний","code":"МГ","dose":"","times":"both","meal":"after","days":3}
notes: "**важно**"
---

\`\`\`winx
meds
card: Курс
| Дата | АЕ | МГ☀️ | МГ🌙 | Заметки |
| --- | :-: | :-: | :-: | --- |
| 2026-11-07 | ✅ | ✅ | ❌ |  |
| 2026-11-08 | ✅ | ☐ | ☐ | сегодня |
| 2026-11-09 |  | ☐ | ☐ |  |
\`\`\`
`;
const REC = {
  start: "2026-11-07", meds: MEDS, notes: "**важно**",
  marks: { "2026-11-07": { "АЕ": "✅", "МГ☀️": "✅", "МГ🌙": "❌" }, "2026-11-08": { "АЕ": "✅" } },
  dayNotes: { "2026-11-08": "сегодня" },
};

const MEDICATION_TEXT = "---\ncssclasses:\n  - dashboard\n---\n\n```winx\nmeds\n```\n";

const TABLE = `| Дата | БА | МА☀️ | МА🌙 | АЕ | Заметки |
| --- | :-: | :-: | :-: | :-: | --- |
| 2026-11-07 | ✅ | ✅ | ✅ | ✅ |  |
| 2026-11-08 | ✅ | ✅ | ☐ | ❌ | сегодня |
| 2026-11-09 |  | ☐ | ☐ | ☐ |  |`;

test("parseCourse: the columns (a code and its time of day) and a row per day (its marks, its note)", () => {
  const { columns, rows } = parseCourse(TABLE);

  assert.deepEqual(columns, [
    { code: "БА", time: "" }, { code: "МА", time: "☀️" }, { code: "МА", time: "🌙" }, { code: "АЕ", time: "" },
  ]);
  assert.deepEqual(rows[1], { date: "2026-11-08", marks: ["✅", "✅", "☐", "❌"], note: "сегодня" });
  assert.deepEqual(rows[2].marks, ["", "☐", "☐", "☐"]);
});


test("courseFromNote: the properties and the table's marks and day notes as a record", () => {
  assert.deepEqual(courseFromNote(NOTE, FM), REC);
});

test("courseFromNote: a medicine without a code gets its first two letters", () => {
  const fm = { ...FM, meds: [{ ...MEDS[0], code: undefined }, MEDS[1]] };

  assert.equal(courseFromNote(NOTE, fm).meds[0].code, "АЕ");
});

test("checkCourse: the record draws the old table; a cell off names its date and key", () => {
  checkCourse(NOTE, REC, "2026-11-08");
  assert.throws(() => checkCourse(NOTE, withMark(REC, "2026-11-07", "МГ🌙", "✅"), "2026-11-08"),
    /2026-11-07 МГ🌙: ❌ ≠ ✅/);
  assert.throws(() => checkCourse(NOTE, { ...REC, start: "2026-11-06" }, "2026-11-08"),
    /2026-11-06/);
  assert.throws(() => checkCourse(NOTE, { ...REC, meds: [] }, "2026-11-08"), /no medicines/);
});

test("migrateMedsNotes: new records c1…; a course already there is skipped", () => {
  const first = migrateMedsNotes([{ path: P, text: NOTE, fm: FM }], {}, "2026-11-08");

  assert.deepEqual(first.records, { c1: { ...REC, migratedFrom: P } });
  assert.deepEqual(first.added, [P]);
  assert.deepEqual(first.marks, { done: 3, skipped: 1 });
  assert.equal(first.dayNotes, 1);
  const again = migrateMedsNotes([{ path: P, text: NOTE, fm: FM }], first.records, "2026-11-08");

  assert.deepEqual(again.added, []);
  assert.deepEqual(again.skipped, [P]);
  assert.deepEqual(again.records, first.records);
});

test("migrateMedsNotes: different source notes keep separate histories despite matching dates and codes", () => {
  const other = NOTE.replace("| 2026-11-08 | ✅ | ☐ | ☐ | сегодня |",
    "| 2026-11-08 | ❌ | ✅ | ☐ | другой курс |");
  const result = migrateMedsNotes([
    { path: P, text: NOTE, fm: FM },
    { path: `${DIR}/Другой курс.md`, text: other, fm: FM },
  ], {}, "2026-11-08");

  assert.equal(Object.keys(result.records).length, 2);
  assert.equal(result.records.c1.marks["2026-11-08"].АЕ, "✅");
  assert.equal(result.records.c2.marks["2026-11-08"].АЕ, "❌");
  assert.equal(result.records.c2.dayNotes["2026-11-08"], "другой курс");
  const again = migrateMedsNotes([
    { path: P, text: NOTE, fm: FM },
    { path: `${DIR}/Другой курс.md`, text: other, fm: FM },
  ], result.records, "2026-11-08");

  assert.deepEqual(again.records, result.records);
  assert.equal(again.skipped.length, 2);
});

test("migrateMedsNotes: identical notes at different paths remain separate courses", () => {
  const notes = [P, `${DIR}/Второй курс.md`].map(path => ({ path, text: NOTE, fm: FM }));
  const result = migrateMedsNotes(notes, {}, "2026-11-08");

  assert.equal(Object.keys(result.records).length, 2);
  assert.deepEqual(result.records.c1.marks, REC.marks);
  assert.deepEqual(result.records.c2.marks, REC.marks);
});

test("migrateMedsNotes: an imported course changed before retry stops without replacing history", () => {
  const first = migrateMedsNotes([{ path: P, text: NOTE, fm: FM }], {}, "2026-11-08");
  const changed = { c1: withMark(first.records.c1, "2026-11-08", "МГ🌙", "✅") };
  const before = structuredClone(changed);

  assert.throws(() => migrateMedsNotes([{ path: P, text: NOTE, fm: FM }], changed, "2026-11-08"),
    /changed since migration/);
  assert.deepEqual(changed, before);
});

test("migrateMedsNotes: a legacy match with different history requires review", () => {
  const existing = { c1: withMark(REC, "2026-11-08", "МГ🌙", "✅") };

  assert.throws(() => migrateMedsNotes([{ path: P, text: NOTE, fm: FM }], existing, "2026-11-08"),
    /already has a course with this start and codes/);
});

test("migrateMeds: courses.json written, the note renamed (old), Medication.md made, the base trashed; twice: nothing", async () => {
  const { files } = vault({ [P]: NOTE, [MEDICATION_BASE]: "views: []" }, { props: { [P]: FM } });

  await migrateMeds();
  assert.deepEqual(JSON.parse(files[COURSES]).c1, { ...REC, migratedFrom: P });
  assert.equal(files[`${DIR}/Аевит, Магний (old).md`], NOTE);
  assert.equal(P in files, false);
  assert.equal(files[MEDICATION], MEDICATION_TEXT);
  assert.equal(MEDICATION_BASE in files, false);
  assert.match(Notice.last, /^✦ 1 course\(s\) migrated: 3 ✅, 1 ❌, 1 day notes; old notes: Аевит, Магний \(old\)\.md/);
  const before = structuredClone(files);

  await migrateMeds();
  assert.deepEqual(files, before);
  assert.equal(Notice.last, "✦ no medication course to migrate");
});

test("migrateMeds: courses.json that isn't JSON stops it, nothing written", async () => {
  const { files } = vault({ [P]: NOTE, [COURSES]: "{ oops" }, { props: { [P]: FM } });
  const before = structuredClone(files);

  await migrateMeds();
  assert.match(Notice.last, /^✦ migration stopped/);
  assert.deepEqual(files, before);
});

test("migrateMeds: a cell the record can't draw stops it before any write", async () => {
  const bad = NOTE.replace("| 2026-11-09 |  |", "| 2026-11-09 | ✅ |");
  const { files } = vault({ [P]: bad }, { props: { [P]: FM } });
  const before = structuredClone(files);

  await migrateMeds();
  assert.match(Notice.last, /^✦ migration stopped: .*2026-11-09 АЕ/);
  assert.deepEqual(files, before);
});

test("migrateMeds: a course already in courses.json is named as skipped; its note still renamed", async () => {
  const { files } = vault({ [P]: NOTE, [COURSES]: JSON.stringify({ c1: REC }) }, { props: { [P]: FM } });

  await migrateMeds();
  assert.deepEqual(JSON.parse(files[COURSES]), { c1: { ...REC, migratedFrom: P } });
  assert.equal(files[`${DIR}/Аевит, Магний (old).md`], NOTE);
  assert.match(Notice.last, /^✦ 0 course\(s\) migrated: .*; skipped, already in courses\.json: Аевит, Магний\.md$/);
});

test("migrateMeds: interrupted rename followed by a new mark keeps both histories on retry", async () => {
  const { app, files } = vault({ [P]: NOTE }, { props: { [P]: FM } });
  const rename = app.fileManager.renameFile;

  app.fileManager.renameFile = async () => { throw new Error("rename failed"); };
  await migrateMeds();
  assert.match(Notice.last, /rename failed/);
  const newer = withMark(JSON.parse(files[COURSES]).c1, "2026-11-08", "МГ🌙", "✅");

  files[COURSES] = JSON.stringify({ c1: newer });
  const before = structuredClone(files);

  app.fileManager.renameFile = rename;
  await migrateMeds();
  assert.match(Notice.last, /changed since migration/);
  assert.deepEqual(files, before);
});

test("migrateMeds: an \"(old)\" note already there stops it before any write, named", async () => {
  const OLD = `${DIR}/Аевит, Магний (old).md`;
  const { files } = vault({ [P]: NOTE, [OLD]: "earlier" }, { props: { [P]: FM } });
  const before = structuredClone(files);

  await migrateMeds();
  assert.match(Notice.last, /^✦ migration stopped: .*Аевит, Магний \(old\)\.md already exists/);
  assert.deepEqual(files, before);
});
