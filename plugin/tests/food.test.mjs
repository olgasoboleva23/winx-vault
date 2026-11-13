import { test } from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_MARKS, dayNote, eaten, foodList, foodWeek, marksOf, newFoodId, withEaten, withFood,
  withMarks, withNote, withoutEaten, withTask,
} from "#/models/food.js";
import { forFood } from "#/models/course.js";

const MARKS = [{ tag: "m1", icon: "🍫", name: "какао" }];
const FOOD = {
  marks: MARKS, task: "t5",
  foods: { f1: { name: "каша с 4 ч", marks: ["m1"] }, f2: { name: "кофе с бзм", marks: ["m3"] } },
};
const LOG = {
  "2026-11-02": { eaten: ["f1", "f2"], note: "сыпь на подбородке" },
  "2026-11-03": { eaten: ["f1"], note: "" },
};

test("food.json: foods in file order, a new id after the biggest, a food set in place or "
  + "added, the marks and task set, the default marks", () => {
  assert.deepEqual(foodList(FOOD), [
    { id: "f1", name: "каша с 4 ч", marks: ["m1"] },
    { id: "f2", name: "кофе с бзм", marks: ["m3"] },
  ]);
  assert.deepEqual(foodList({}), []);
  assert.equal(newFoodId(FOOD), "f3");
  assert.equal(newFoodId({}), "f1");

  const renamed = withFood(FOOD, { id: "f2", name: " кофе с безлактозным ", marks: [] });
  const added = withFood(FOOD, { id: "f3", name: "какао", marks: ["m1", "m2"] });

  assert.deepEqual(foodList(renamed).map(f => [f.id, f.name, f.marks]),
    [["f1", "каша с 4 ч", ["m1"]], ["f2", "кофе с безлактозным", []]]);
  assert.deepEqual(foodList(added).at(-1), { id: "f3", name: "какао", marks: ["m1", "m2"] });
  assert.equal(foodList(FOOD).length, 2);   // the old object untouched

  assert.deepEqual(marksOf(FOOD), MARKS);
  assert.deepEqual(DEFAULT_MARKS.map(m => m.icon), ["🍫", "🥛", "🥛↓"]);
  assert.equal(marksOf({}), DEFAULT_MARKS);
  assert.deepEqual(withMarks(FOOD, []), { ...FOOD, marks: [] });
  assert.deepEqual(withTask(FOOD, "t9"), { ...FOOD, task: "t9" });
});

test("log.json: what was eaten by day, the day's note; one eaten added or taken off, a note "
  + "set or cleared, an empty day dropped", () => {
  assert.deepEqual(eaten(LOG, "2026-11-02"), ["f1", "f2"]);
  assert.deepEqual(eaten(LOG, "2026-11-04"), []);
  assert.equal(dayNote(LOG, "2026-11-02"), "сыпь на подбородке");
  assert.equal(dayNote(LOG, "2026-11-03"), "");

  assert.deepEqual(withEaten(LOG, "2026-11-03", "f2")["2026-11-03"],
    { eaten: ["f1", "f2"], note: "" });
  assert.deepEqual(withEaten({}, "2026-11-04", "f2"),
    { "2026-11-04": { eaten: ["f2"], note: "" } });
  assert.deepEqual(withoutEaten(LOG, "2026-11-02", 1)["2026-11-02"],
    { eaten: ["f1"], note: "сыпь на подбородке" });
  assert.equal(withoutEaten(LOG, "2026-11-02", 5), LOG);
  assert.deepEqual(Object.keys(withoutEaten(LOG, "2026-11-03", 0)), ["2026-11-02"]);
  assert.deepEqual(eaten(LOG, "2026-11-02"), ["f1", "f2"]);   // the old object untouched

  assert.equal(withNote(LOG, "2026-11-02", " прошло ")["2026-11-02"].note, "прошло");
  assert.deepEqual(withNote(LOG, "2026-11-03", "ок")["2026-11-03"], { eaten: ["f1"], note: "ок" });
  assert.deepEqual(withNote(LOG, "2026-11-02", "")["2026-11-02"],
    { eaten: ["f1", "f2"], note: "" });
  assert.deepEqual(withNote({ "2026-11-03": { eaten: [], note: "ок" } }, "2026-11-03", ""), {});
});

test("foodWeek: a row per day: what was eaten with its marks, the marks counted, each "
  + "journal's level after its lag, the courses on, the note", () => {
  const marks = [...DEFAULT_MARKS];
  const entries = new Map([["2026-11-03", { level: 2, reasons: ["🍰"] }]]);
  const journals = [{ path: "J/Skin.md", name: "Skin", lag: 1, entries }];
  // a course as courses.json keeps it; АЕ has no days: 90, as the course's grid shows it
  const courses = [forFood("c1", { start: "2026-11-02", meds: [
    { name: "мастодинон", code: "МА", times: ["morning", "evening"], days: 10 },
    { name: "баксет", code: "БА", times: [], days: 1 }, { name: "аевит", code: "АЕ" },
  ], marks: { "2026-11-02": { "МА☀️": "✅", "БА": "❌" } } })];
  const days = ["2026-11-02", "2026-11-03"];
  const [mon, tue] =
    foodWeek({ foods: foodList(FOOD), marks, log: LOG, journals, courses, days });

  assert.deepEqual(mon.items.map(i => [i.id, i.name, i.icons]),
    [["f1", "каша с 4 ч", "🍫"], ["f2", "кофе с бзм", "🥛↓"]]);
  assert.deepEqual(mon.counts, { m1: 1, m2: 0, m3: 1 });
  // the next day's
  assert.deepEqual(mon.journals, [{ name: "Skin", level: 2, reasons: ["🍰"], on: "2026-11-03" }]);
  // the course's medicines on that day: a short code each, the full name for its tip
  assert.deepEqual(mon.courses, [{ id: "c1", name: "мастодинон, баксет, аевит", meds: [
    { code: "МА", name: "мастодинон", taken: true },
    { code: "БА", name: "баксет", taken: false },
    { code: "АЕ", name: "аевит", taken: false },
  ] }]);
  // баксет's one day is over
  assert.deepEqual(tue.courses[0].meds.map(m => m.code), ["МА", "АЕ"]);
  assert.equal(mon.note, "сыпь на подбородке");
  assert.deepEqual(tue.journals, [{ name: "Skin", level: null, reasons: [], on: "2026-11-04" }]);
});

test("foodWeek: a task set puts its done days on the rows; no task, no field", () => {
  const days = ["2026-11-02", "2026-11-03"];
  const args = { foods: [], marks: [], log: {}, journals: [], courses: [], days };
  const task = { id: "t5", name: "gym", days: new Set(["2026-11-02"]) };
  const [mon, tue] = foodWeek({ ...args, task });

  assert.deepEqual([mon.trained, tue.trained], [true, false]);
  assert.equal(foodWeek(args)[0].trained, undefined);
});
