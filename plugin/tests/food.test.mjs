import { test } from "node:test";
import assert from "node:assert/strict";
import { Foods, FoodLog, foodWeek, DEFAULT_MARKS } from "#/models/food.js";

const FOODS = `---
marks:
  - {"tag":"m1","icon":"🍫","name":"какао"}
---
- f1 каша с 4 ч #m1
- f2 кофе с бзм #m3
`;
const LOG = `- 2026-11-02 f1
- 2026-11-02 f2
- 2026-11-02 note: сыпь на подбородке
- 2026-11-03 f1
`;

test("Foods: id, name and marks per line; a new id after the biggest; a food set in place or added; the default marks", () => {
  const foods = new Foods(FOODS);

  assert.deepEqual(foods.list, [{ id: "f1", name: "каша с 4 ч", marks: ["m1"] }, { id: "f2", name: "кофе с бзм", marks: ["m3"] }]);
  assert.equal(foods.nextId, "f3");
  assert.equal(new Foods("").nextId, "f1");
  assert.match(foods.set({ id: "f2", name: "кофе с безлактозным", marks: [] }), /\n- f2 кофе с безлактозным\n$/);
  assert.match(foods.set({ id: "f3", name: "какао", marks: ["m1", "m2"] }), /\n- f2 кофе с бзм #m3\n- f3 какао #m1 #m2\n$/);
  assert.deepEqual(DEFAULT_MARKS.map(m => m.icon), ["🍫", "🥛", "🥛↓"]);
});

test("FoodLog: what was eaten by day, the day's note; one eaten taken off, a note set or cleared", () => {
  const log = new FoodLog(LOG);

  assert.deepEqual(log.eaten("2026-11-02"), ["f1", "f2"]);
  assert.equal(log.note("2026-11-02"), "сыпь на подбородке");
  assert.equal(log.note("2026-11-03"), "");
  assert.equal(log.add("2026-11-03", "f2"), LOG + "- 2026-11-03 f2\n");
  assert.equal(log.remove("2026-11-02", 1), LOG.replace("- 2026-11-02 f2\n", ""));
  assert.equal(log.setNote("2026-11-02", "прошло"), LOG.replace("note: сыпь на подбородке", "note: прошло"));
  assert.equal(log.setNote("2026-11-03", "ок"), LOG + "- 2026-11-03 note: ок\n");
  assert.equal(log.setNote("2026-11-02", ""), LOG.replace("- 2026-11-02 note: сыпь на подбородке\n", ""));
});

test("foodWeek: a row per day: what was eaten with its marks, the marks counted, each journal's level after its lag, the courses on, the note", () => {
  const marks = [...DEFAULT_MARKS];
  const journals = [{ path: "J/Skin.md", name: "Skin", lag: 1, entries: new Map([["2026-11-03", { level: 2, reasons: ["🍰"] }]]) }];
  const courses = [{ path: "M/A.md", name: "A", start: "2026-11-02", days: 10, meds: [
    { code: "МА", name: "мастодинон", days: 10 }, { code: "БА", name: "баксет", days: 1 },
  ], taken: new Map([["2026-11-02", new Set(["МА"])]]) }];
  const days = ["2026-11-02", "2026-11-03"];
  const [mon, tue] = foodWeek({ foods: new Foods(FOODS).list, marks, log: new FoodLog(LOG), journals, courses, days });

  assert.deepEqual(mon.items.map(i => [i.id, i.name, i.icons]), [["f1", "каша с 4 ч", "🍫"], ["f2", "кофе с бзм", "🥛↓"]]);
  assert.deepEqual(mon.counts, { m1: 1, m2: 0, m3: 1 });
  assert.deepEqual(mon.journals, [{ name: "Skin", level: 2, reasons: ["🍰"], on: "2026-11-03" }]);   // the next day's
  // the course's medicines on that day: a short code each, the full name for its tip
  assert.deepEqual(mon.courses, [{ path: "M/A.md", name: "A", meds: [{ code: "МА", name: "мастодинон", taken: true }, { code: "БА", name: "баксет", taken: false }] }]);
  assert.deepEqual(tue.courses[0].meds.map(m => m.code), ["МА"]);   // баксет's one day is over
  assert.equal(mon.note, "сыпь на подбородке");
  assert.deepEqual(tue.journals, [{ name: "Skin", level: null, reasons: [], on: "2026-11-04" }]);
});

test("foodWeek: a task set puts its done days on the rows; no task, no field", () => {
  const args = { foods: [], marks: [], log: new FoodLog(""), journals: [], courses: [], days: ["2026-11-02", "2026-11-03"] };
  const task = { id: "t5", name: "gym", days: new Set(["2026-11-02"]) };
  const [mon, tue] = foodWeek({ ...args, task });

  assert.deepEqual([mon.trained, tue.trained], [true, false]);
  assert.equal(foodWeek(args)[0].trained, undefined);
});
