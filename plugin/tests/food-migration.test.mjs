import { test } from "node:test";
import assert from "node:assert/strict";
import { vault } from "./stubs/vault.mjs";
import { Notice } from "obsidian";
import { foodFromNotes, migrateFood } from "#/migrations/food.js";
import { FOOD_DATA, FOOD_LOG, FOOD_LOG_NOTE, FOODS_NOTE } from "#/helpers/paths.js";

const MARKS = [{ tag: "m1", icon: "🍫", name: "какао" }];
const FM = { marks: MARKS, task: "t5" };
const FOODS = `---
marks:
  - {"tag":"m1","icon":"🍫","name":"какао"}
task: t5
---
- f1 каша с 4 ч #m1
- f2 кофе с бзм #m1 #m3

`;
const LOG = `- 2026-11-02 f1
- 2026-11-02 f2
- 2026-11-02 note: сыпь на подбородке
что-то не то
- 2026-11-03 f1
`;
const FOOD = {
  marks: MARKS, task: "t5",
  foods: {
    f1: { name: "каша с 4 ч", marks: ["m1"] }, f2: { name: "кофе с бзм", marks: ["m1", "m3"] },
  },
};
const DAYS = {
  "2026-11-02": { eaten: ["f1", "f2"], note: "сыпь на подбородке" },
  "2026-11-03": { eaten: ["f1"], note: "" },
};

test("foodFromNotes: the foods with their marks and task, the days with what was eaten and "
  + "the note; a line understood by neither counted", () => {
  assert.deepEqual(foodFromNotes(FOODS, FM, LOG), { food: FOOD, log: DAYS, skipped: 1 });
  assert.deepEqual(foodFromNotes("", {}, ""), { food: { foods: {} }, log: {}, skipped: 0 });
});

test("migrateFood: food.json and log.json written, the notes renamed (old); twice: nothing",
  async () => {
  const notes = { [FOODS_NOTE]: FOODS, [FOOD_LOG_NOTE]: LOG };
  const { files } = vault(notes, { props: { [FOODS_NOTE]: FM } });
  const old = path => path.replace(".md", " (old).md");

  await migrateFood();
  assert.deepEqual(JSON.parse(files[FOOD_DATA]), FOOD);
  assert.deepEqual(JSON.parse(files[FOOD_LOG]), DAYS);
  assert.equal(files[old(FOODS_NOTE)], FOODS);
  assert.equal(files[old(FOOD_LOG_NOTE)], LOG);
  assert.equal(FOODS_NOTE in files || FOOD_LOG_NOTE in files, false);
  assert.equal(Notice.last,
    "✦ food migrated: 2 foods, 1 marks, 2 days (3 eaten, 1 notes); 1 lines not understood");
  const before = structuredClone(files);

  await migrateFood();
  assert.deepEqual(files, before);
  assert.equal(Notice.last, "✦ food is already migrated");
});

test("migrateFood: no Foods.md, nothing to migrate; an \"(old)\" note already there stops "
  + "it, nothing written", async () => {
  const { files } = vault({});

  await migrateFood();
  assert.equal(Notice.last, "✦ nothing to migrate");
  assert.deepEqual(files, {});

  const OLD = FOODS_NOTE.replace(".md", " (old).md");
  const taken = vault({ [FOODS_NOTE]: FOODS, [OLD]: "earlier" }).files;
  const before = structuredClone(taken);

  await migrateFood();
  assert.match(Notice.last, /^✦ migration stopped: Foods \(old\)\.md already exists/);
  assert.deepEqual(taken, before);
});
