import { test } from "node:test";
import assert from "node:assert/strict";
import { migrate } from "#/models/taskMigration.js";
import { migrateTasks } from "#/controllers/tasks.js";
import { vault } from "./stubs/vault.mjs";
import { Notice } from "obsidian";

const DIR = "00 System/Data/Tasks";
const MASTER = `${DIR}/Master.md`, POOL = `${DIR}/Pool.md`, RECORDS = `${DIR}/tasks.json`;

test("an emoji line with every field becomes an id and Dataview fields in order", () => {
  const old = "- [x] #⭐⭐medium #area/body #time/morning stretch a bit ![[cat.webp|28]] "
    + "🔁 every day when done ➕ 2026-11-07 📅 2026-11-08 ✅ 2026-11-08";
  const { master, records } = migrate(old, "");

  assert.equal(master, "- [x] t1 [repeat:: every day when done] [due:: 2026-11-08] "
    + "[created:: 2026-11-07] [completion:: 2026-11-08]");
  assert.deepEqual(records, { t1: {
    name: "stretch a bit", difficulty: "#⭐⭐medium", area: "#area/body", time: "morning",
    goal: null, tags: [], sticker: "cat.webp", after: null,
  } });
});

test("start and scheduled are kept; priority, 🆔, ⛔ and a dateless ✅ go", () => {
  const old = "- [ ] #⭐easy #health #easy tidy desk ⏬ 🆔 abc123 ⛔ xyz789 🛫 2026-04-01 "
    + "⏳ 2026-04-02 ✅";

  const { master, records } = migrate(old, "");

  assert.equal(master, "- [ ] t1 [start:: 2026-04-01] [scheduled:: 2026-04-02]");
  assert.equal(records.t1.name, "tidy desk");
  assert.deepEqual(records.t1.tags, ["#health", "#easy"]);
});

test("two spellings of one task get one id; the record from the latest copy", () => {
  const old = [
    "- [x] #⭐easy Water  Plants 📅 2026-11-01 ✅ 2026-11-01",
    "- [ ] #⭐⭐medium water plants 📅 2026-11-05",
    "- [x] #⭐easy read a page ✅ 2026-11-02",
  ].join("\n");
  const { master, records } = migrate(old, "");

  assert.equal(master, "- [x] t1 [due:: 2026-11-01] [completion:: 2026-11-01]\n"
    + "- [ ] t1 [due:: 2026-11-05]\n- [x] t2 [completion:: 2026-11-02]");
  assert.equal(records.t1.name, "water plants");
  assert.equal(records.t1.difficulty, "#⭐⭐medium");
  assert.deepEqual(Object.keys(records), ["t1", "t2"]);
});

test("a pool line and a Master line with the same words share the id, with pool: true", () => {
  const pool = "Things to pick from.\n\n- #⭐easy #area/home Feed the fish ![[fish.webp|28]]\n"
    + "- #⭐easy #area/home dust shelves\n";
  const { master, records } = migrate("- [ ] #⭐easy #area/home feed the fish 📅 2026-11-03", pool);

  assert.equal(master, "- [ ] t1 [due:: 2026-11-03]");
  assert.equal(records.t1.pool, true);
  assert.equal(records.t1.name, "feed the fish");
  assert.deepEqual(records.t2, {
    name: "dust shelves", difficulty: "#⭐easy", area: "#area/home", time: null, goal: null,
    tags: [], sticker: null, after: null, pool: true,
  });
});

test("#after/id/x points at the task carrying #id/x; #id itself is not kept; goals kept", () => {
  const old = [
    "- [ ] #⭐easy #after/id/run rinse hair 🔁 every day 📅 2026-11-03",
    "- [ ] #⭐⭐medium #id/run #goal/run #goal/legs morning run 🔁 every day 📅 2026-11-03",
    "- [ ] #⭐easy #after/id/nobody nap",
  ].join("\n");
  const { records } = migrate(old, "");

  assert.equal(records.t1.after, "t2");
  assert.deepEqual(records.t1.tags, []);
  assert.equal(records.t2.goal, "#goal/run");
  assert.deepEqual(records.t2.tags, ["#goal/legs"]);
  assert.equal(records.t3.after, null);
});

test("non-task lines and indentation are kept", () => {
  const old = "# Tasks\n\nsome text\n  - [ ] #⭐easy nested one 📅 2026-11-03\n";

  assert.equal(migrate(old, "").master, "# Tasks\n\nsome text\n  - [ ] t1 [due:: 2026-11-03]\n");
});

test("the command refuses when tasks.json exists or Master.md is missing", async () => {
  const { files } = vault({ [MASTER]: "- [ ] #⭐easy walk", [RECORDS]: "{}" });

  await migrateTasks();
  assert.equal(files[MASTER], "- [ ] #⭐easy walk");
  assert.match(Notice.last, /tasks\.json/);

  const none = vault({});

  await migrateTasks();
  assert.deepEqual(none.files, {});
  assert.match(Notice.last, /Master\.md/);
});

test("the command keeps old copies, rewrites Master.md, writes tasks.json, trashes Pool.md", async () => {
  const oldMaster = "- [ ] #⭐easy walk 📅 2026-11-03", oldPool = "Pool.\n\n- #⭐easy nap\n";
  const { files } = vault({ [MASTER]: oldMaster, [POOL]: oldPool });

  await migrateTasks();
  assert.equal(files[`${DIR}/Master (old).md`], oldMaster);
  assert.equal(files[`${DIR}/Pool (old).md`], oldPool);
  assert.equal(files[MASTER], "- [ ] t1 [due:: 2026-11-03]");
  assert.deepEqual(Object.keys(JSON.parse(files[RECORDS])), ["t1", "t2"]);
  assert.equal(files[RECORDS], JSON.stringify(JSON.parse(files[RECORDS]), null, 2));
  assert.equal(POOL in files, false);
  assert.equal(Notice.last, "✦ 2 tasks migrated: switch Tasks → Task format → Dataview");
});

test("the command refuses when Master (old).md is already there: nothing written", async () => {
  const before = { [MASTER]: "- [ ] #⭐easy walk", [`${DIR}/Master (old).md`]: "old" };
  const { files } = vault({ ...before });

  await migrateTasks();
  assert.deepEqual(files, before);
  assert.match(Notice.last, /Master \(old\)\.md/);
});

test("a failing tasks.json write leaves Master.md untouched and says so", async () => {
  const { files, app } = vault({ [MASTER]: "- [ ] #⭐easy walk" });
  const create = app.vault.create;

  app.vault.create = async (p, text) => {
    if (p === RECORDS) throw new Error("disk full");
    return create(p, text);
  };
  await migrateTasks();
  assert.equal(files[MASTER], "- [ ] #⭐easy walk");
  assert.equal(Notice.last,
    "✦ migration stopped: disk full — your old notes are in Master (old).md");
});
