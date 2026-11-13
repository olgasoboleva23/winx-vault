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
  assert.equal(Notice.last, "✦ food is already migrated: food.json, log.json have data");
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

test("foodFromNotes: a line read but lost (a day's second note, a food id twice, a note "
  + "cleared) or properties not read yet stop it", () => {
  const twice = LOG + "- 2026-11-02 note: прошло\n";

  assert.throws(() => foodFromNotes(FOODS, FM, twice), /1 day notes kept of 2 note lines/);
  assert.throws(() => foodFromNotes(FOODS + "- f1 чай\n", FM, LOG), /2 foods kept of 3 food lines/);
  assert.throws(() => foodFromNotes(FOODS, FM, LOG + "- 2026-11-02 note: \n"),
    /0 day notes kept of 1 note lines/);
  assert.throws(() => foodFromNotes(FOODS, { task: "t5" }, LOG),
    /Foods\.md's marks not read yet/);
  // a note line with nothing in it, on a day without one, loses nothing
  assert.equal(foodFromNotes(FOODS, FM, LOG + "- 2026-11-04 note: \n").skipped, 1);
});

test("migrateFood: a day's second note stops it before any write, named; log.json alone "
  + "with data is named", async () => {
  const notes = { [FOODS_NOTE]: FOODS, [FOOD_LOG_NOTE]: LOG + "- 2026-11-02 note: прошло\n" };
  const { files } = vault(notes, { props: { [FOODS_NOTE]: FM } });
  const before = structuredClone(files);

  await migrateFood();
  assert.match(Notice.last, /^✦ migration stopped: Log\.md: 1 day notes kept of 2 note lines/);
  assert.deepEqual(files, before);

  vault({ [FOODS_NOTE]: FOODS, [FOOD_LOG]: JSON.stringify({ "2026-11-02": {} }) },
    { props: { [FOODS_NOTE]: FM } });
  await migrateFood();
  assert.match(Notice.last, /log\.json has different data/);
});

test("migrateFood: a failed log write resumes without losing or duplicating eaten history", async () => {
  const { app, files } = vault({ [FOODS_NOTE]: FOODS, [FOOD_LOG_NOTE]: LOG },
    { props: { [FOODS_NOTE]: FM } });
  const create = app.vault.create;

  app.vault.create = async (path, text) => {
    if (path === FOOD_LOG) throw new Error("disk failure");
    return create(path, text);
  };
  await migrateFood();
  assert.match(Notice.last, /disk failure/);
  assert.deepEqual(JSON.parse(files[FOOD_DATA]), FOOD);
  assert.equal(files[FOOD_LOG_NOTE], LOG);
  app.vault.create = create;
  await migrateFood();
  assert.deepEqual(JSON.parse(files[FOOD_DATA]), FOOD);
  assert.deepEqual(JSON.parse(files[FOOD_LOG]), DAYS);
  assert.equal(files[FOODS_NOTE.replace(".md", " (old).md")], FOODS);
  assert.equal(files[FOOD_LOG_NOTE.replace(".md", " (old).md")], LOG);
});

test("migrateFood: a failed last rename resumes using the earlier renamed source", async () => {
  const oldFoods = FOODS_NOTE.replace(".md", " (old).md");
  const { app, files } = vault({ [FOODS_NOTE]: FOODS, [FOOD_LOG_NOTE]: LOG },
    { props: { [FOODS_NOTE]: FM, [oldFoods]: FM } });
  const rename = app.fileManager.renameFile;

  app.fileManager.renameFile = async (file, path) => {
    if (file.path === FOOD_LOG_NOTE) throw new Error("rename failed");
    return rename(file, path);
  };
  await migrateFood();
  assert.match(Notice.last, /rename failed/);
  assert.equal(files[oldFoods], FOODS);
  app.fileManager.renameFile = rename;
  await migrateFood();
  assert.deepEqual(JSON.parse(files[FOOD_DATA]), FOOD);
  assert.deepEqual(JSON.parse(files[FOOD_LOG]), DAYS);
  assert.equal(files[FOOD_LOG_NOTE.replace(".md", " (old).md")], LOG);
});

test("migrateFood: retry refuses a catalog edited since the interrupted import", async () => {
  const newer = { ...FOOD, task: "t99" };
  const { files } = vault({
    [FOODS_NOTE]: FOODS, [FOOD_LOG_NOTE]: LOG, [FOOD_DATA]: JSON.stringify(newer),
  }, { props: { [FOODS_NOTE]: FM } });
  const before = structuredClone(files);

  await migrateFood();
  assert.match(Notice.last, /food\.json has different data/);
  assert.deepEqual(files, before);
});

test("migrateFood: a simultaneous log edit is preserved and the sources stay available", async () => {
  const { app, files } = vault({
    [FOODS_NOTE]: FOODS, [FOOD_LOG_NOTE]: LOG, [FOOD_LOG]: "{}",
  }, { props: { [FOODS_NOTE]: FM } });
  const process = app.vault.process;
  const newer = { "2026-11-13": { eaten: ["f1"], note: "new" } };

  app.vault.process = async (file, fn) => {
    if (file.path === FOOD_LOG) files[FOOD_LOG] = JSON.stringify(newer);
    return process(file, fn);
  };
  await migrateFood();
  assert.match(Notice.last, /log\.json has different data/);
  assert.deepEqual(JSON.parse(files[FOOD_LOG]), newer);
  assert.equal(files[FOODS_NOTE], FOODS);
  assert.equal(files[FOOD_LOG_NOTE], LOG);
});
