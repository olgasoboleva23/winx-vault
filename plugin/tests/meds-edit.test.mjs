import { test } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import { editCourse, loadMeds, newCourse, pickCourse, setDayNote, tickMeds } from "#/controllers/meds.js";
import { COURSES } from "#/helpers/paths.js";
import { Notice } from "obsidian";

globalThis.window ??= {};
window.moment = () => ({ format: () => "2026-11-08" });

// a course as a record (made-up medicines), as in course.test.mjs
const REC = {
  start: "2026-11-07",
  meds: [
    { name: "Аевит", code: "АЕ", dose: "1 таблетка", times: "any", meal: "after", days: 2 },
    { name: "Магний 2 таблетки", code: "МГ", dose: "", times: "both", meal: "before", days: 3 },
  ],
  notes: "",
  marks: {
    "2026-11-07": { "АЕ": "✅", "МГ☀️": "✅", "МГ🌙": "❌" },
    "2026-11-08": { "МГ☀️": "✅" },
  },
  dayNotes: { "2026-11-08": "сегодня" },
};
const stored = recs => vault({ [COURSES]: JSON.stringify(recs, null, 2) });
const read = files => JSON.parse(files[COURSES]);

test("tickMeds / setDayNote: one mark or a day's note in courses.json, the medicines untouched", async () => {
  const { files } = stored({ c1: REC });

  assert.equal(await tickMeds("c1", "2026-11-08", "АЕ", "✅"), true);
  assert.equal(read(files).c1.marks["2026-11-08"].АЕ, "✅");
  assert.deepEqual(read(files).c1.meds, REC.meds);
  await setDayNote("c1", "2026-11-08", "");
  assert.equal("2026-11-08" in read(files).c1.dayNotes, false);
});

test("tickMeds: a courses.json that isn't JSON rejects, its text untouched", async () => {
  const { files } = vault({ [COURSES]: "{ broken" });

  await assert.rejects(tickMeds("c1", "2026-11-08", "АЕ", "✅"));
  assert.equal(files[COURSES], "{ broken");
});

test("editCourse: the window with the record's values; saved: the medicines, the marks and notes kept", async () => {
  const { files } = stored({ c1: REC });
  let asked;

  await editCourse("c1", async (title, rows, o) => {
    asked = { title, submit: o.submit, values: o.values };
    return { ...o.values, meds: o.values.meds.map(m => m.code === "МГ" ? { ...m, dose: "1 таблетка" } : m) };
  });
  assert.deepEqual([asked.title, asked.submit], ["✦ Edit medication course", "Save"]);
  assert.equal(asked.values.start, "2026-11-07");
  const c1 = read(files).c1;

  assert.equal(c1.meds[1].dose, "1 таблетка");
  assert.deepEqual([c1.marks, c1.dayNotes], [REC.marks, REC.dayNotes]);
});

test("editCourse: a course gone: nothing asked or written, a notice", async () => {
  const { files } = stored({ c1: REC });
  const before = files[COURSES];
  let calls = 0;

  await editCourse("c9", async () => { calls++; return null; });
  assert.equal(calls, 0);
  assert.equal(files[COURSES], before);
  assert.equal(Notice.last, "✦ that course is gone");
});

test("editCourse: the course deleted while its window was open: nothing written, a notice", async () => {
  const { files } = stored({ c1: REC, c2: REC });
  Notice.last = "";

  await editCourse("c1", async (t, rows, o) => {
    files[COURSES] = JSON.stringify({ c2: REC });
    return o.values;
  });
  assert.deepEqual(Object.keys(read(files)), ["c2"]);
  assert.equal(Notice.last, "✦ that course is gone");
});

test("editCourse: a newer dose is not overwritten by a stale window", async () => {
  const { files } = stored({ c1: REC });
  let newer;

  await editCourse("c1", async (title, rows, o) => {
    newer = structuredClone(REC);
    newer.meds[1].dose = "новая доза";
    files[COURSES] = JSON.stringify({ c1: newer });
    return { ...o.values, notes: "из старого окна" };
  });
  assert.deepEqual(read(files).c1, newer);
  assert.match(Notice.last, /course changed meanwhile/);
});

test("editCourse: new marks and day notes survive a simultaneous property edit", async () => {
  const { files } = stored({ c1: REC });

  await editCourse("c1", async (title, rows, o) => {
    await tickMeds("c1", "2026-11-08", "МГ🌙", "✅");
    await setDayNote("c1", "2026-11-08", "новая заметка дня");
    return { ...o.values, notes: "новая заметка курса" };
  });
  const saved = read(files).c1;

  assert.equal(saved.notes, "новая заметка курса");
  assert.equal(saved.marks["2026-11-08"]["МГ🌙"], "✅");
  assert.equal(saved.dayNotes["2026-11-08"], "новая заметка дня");
});

test("newCourse: saving c1 and c2 opens their Medication Vue page in a new tab", async () => {
  const { app, files } = vault(), opened = [];
  app.workspace.getLeaf = () => ({ setViewState: async s => { opened.push(s); } });
  app.workspace.revealLeaf = async () => {};
  const ask = async () => ({ meds: [{ name: "Аевит" }], start: "", notes: "" });

  assert.equal(await newCourse(ask), "c1");
  assert.equal(read(files).c1.start, "2026-11-08");
  assert.equal(await newCourse(ask), "c2");
  assert.deepEqual(Object.keys(read(files)), ["c1", "c2"]);
  assert.deepEqual(opened, Array(2).fill({
    type: "winx", active: true, state: { page: "meds", meds: {} },
  }));
});

test("pickCourse: none: a notice; one: its id; more: the picker's", async () => {
  vault();
  assert.equal(await pickCourse(), null);
  assert.equal(Notice.last, "✦ no medication course yet");
  let calls = 0;
  const pick = async list => { calls++; return list[1].id; };

  stored({ c1: REC });
  assert.equal(await pickCourse(pick), "c1");
  assert.equal(calls, 0);
  stored({ c1: REC, c2: { ...REC, start: "2026-10-01" } });
  assert.equal(await pickCourse(pick), "c2");
  assert.equal(calls, 1);
});

test("loadMeds: no courses.json: nothing", async () => {
  vault();
  assert.deepEqual(await loadMeds(), { list: [], data: {}, notes: {}, intake: {} });
});
