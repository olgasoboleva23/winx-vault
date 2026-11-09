import { test } from "node:test";
import assert from "node:assert/strict";
import { setApp } from "#/helpers/app.js";
import { logPurchase } from "#/controllers/widgets/shop.js";
import { addTask, saveRecords, newId, editTaskModal, saveNewTask } from "#/controllers/tasks.js";
import { makeActions } from "#/controllers/calendar.js";
import { taskStore } from "#/store/tasks.js";

const MASTER = "00 System/Data/Tasks/Master.md", RECORDS = "00 System/Data/Tasks/tasks.json", BUY = "00 System/Data/Purchases.md";
const later = () => new Promise(r => setTimeout(r, 5));
// a vault in memory: its task notes in the store (done tasks earn gold) and Purchases' lines through a
// Dataview
const vault = (files = {}, records = {}) => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-02" }) };
  const lines = prefix => Object.entries(files).filter(([p]) => p.startsWith(prefix)).flatMap(([, t]) => t.split("\n"))
    .filter(l => /^- /.test(l)).map(l => ({ text: l.replace(/^- /, "") }));

  if (Object.keys(records).length) files[RECORDS] = JSON.stringify(records, null, 2);
  for (const [p, text] of Object.entries(files)) if (p.startsWith("00 System/Data/Tasks/") && p !== RECORDS) taskStore.put(p, text);
  taskStore.putRecords(records);
  const app = {
    plugins: { plugins: { dataview: { api: { pages: src => ({ file: { lists: lines(src.slice(1, -1)) } }) } } } },
    vault: {
      getFileByPath: p => p in files ? { path: p } : null,
      getFolderByPath: () => ({}),
      getAbstractFileByPath: p => ({ path: p }),
      cachedRead: async f => files[f.path],
      // a write lands a moment later, like a real one (and Dataview sees it later still)
      process: async (f, fn) => { await later(); files[f.path] = fn(files[f.path]); },
      read: async f => files[f.path],
      create: async (p, text) => { await later(); files[p] = text; },
    },
  };
  globalThis.__app = app;
  setApp(app);
  return files;
};
// done tasks' records: their difficulty is their gold
const RECS = { t1: { difficulty: "#⭐⭐medium" }, t2: { difficulty: "#⭐easy" }, t3: { difficulty: "#⭐⭐⭐⭐epic" } };

test("a purchase is logged only when the gold covers it", async () => {
  const files = vault({ [MASTER]: "- [x] t1\n- [x] t2\n", [BUY]: "# Purchases\n\n- 2026-10-01 | Tea | 3\n" }, RECS);
  assert.equal(await logPurchase("Coffee", 5), false);   // 5 + 2 earned − 3 spent = 4
  assert.doesNotMatch(files[BUY], /Coffee/);
  assert.equal(await logPurchase("Candy", 4), true);
  assert.match(files[BUY], /- 2026-11-02 \| Candy \| 4\n$/);
});

test("a new task goes to the top of Master.md; none is made when Master.md is missing", async () => {
  const files = vault({ [MASTER]: "- [ ] old\n" });
  assert.equal(await addTask("- [ ] new"), true);
  assert.equal(files[MASTER], "- [ ] new\n- [ ] old\n");
  const none = vault({});
  assert.equal(await addTask("- [ ] new"), false);
  assert.deepEqual(none, {});
});

const json = (files) => JSON.parse(files[RECORDS]);

test("saveRecords merges a patch into a record, null deletes one, a missing file is made", async () => {
  const files = vault({});
  await saveRecords({ t1: { name: "walk", area: null } });
  assert.deepEqual(json(files), { t1: { name: "walk", area: null } });
  await saveRecords({ t1: { area: "#area/body" }, t2: { name: "read" } });
  assert.deepEqual(json(files), { t1: { name: "walk", area: "#area/body" }, t2: { name: "read" } });
  await saveRecords({ t1: null });
  assert.equal(files[RECORDS], JSON.stringify({ t2: { name: "read" } }, null, 2));
});

test("a new id is the biggest one plus one", () => {
  assert.equal(newId(new Map()), "t1");
  assert.equal(newId(new Map([["t2", {}], ["t10", {}]])), "t11");
});

// the Tasks plugin's edit dialog, answering with `edited` (null: cancelled)
const withTasksApi = (edited, seen = []) => {
  const app = globalThis.__app;
  app.plugins.plugins["obsidian-tasks-plugin"] = { apiV1: { editTaskLineModal: async l => (seen.push(l), edited) } };
  return seen;
};
const PICK = { difficulty: "#⭐easy", area: "#area/body", time: "#time/evening", sticker: "a.webp" };

test("editing a task: the picks and the new name go to its record, its dates to its line", async () => {
  const rec = { name: "walk", difficulty: null, area: null, time: null, goal: null, tags: [], sticker: null, after: null };
  const files = vault({ [MASTER]: "- [ ] t1 [due:: 2026-11-03]\n" }, { t1: rec });
  const seen = withTasksApi("- [ ] walk far [due:: 2026-11-05]");
  const item = taskStore.tasks[0];
  await editTaskModal(item, async () => PICK);
  assert.deepEqual(seen, ["- [ ] walk [due:: 2026-11-03]"]);
  assert.deepEqual(json(files).t1, { ...rec, ...{ difficulty: "#⭐easy", area: "#area/body", time: "evening", sticker: "a.webp" }, name: "walk far" });
  assert.equal(files[MASTER], "- [ ] t1 [due:: 2026-11-05]\n");
});

test("renamed to another task's name: the record is renamed, the two ids stay", async () => {
  const files = vault({ [MASTER]: "- [ ] t1\n- [ ] t2\n" }, { t1: { name: "walk" }, t2: { name: "read" } });
  withTasksApi("- [ ] read");
  await editTaskModal(taskStore.tasks[0], async () => PICK);
  assert.equal(json(files).t1.name, "read");
  assert.equal(json(files).t2.name, "read");
  assert.equal(files[MASTER], "- [ ] t1\n- [ ] t2\n");
});

test("a cancelled Tasks dialog writes nothing", async () => {
  const files = vault({ [MASTER]: "- [ ] t1\n" }, { t1: { name: "walk" } });
  withTasksApi("");
  await editTaskModal(taskStore.tasks[0], async () => PICK);
  assert.deepEqual(json(files), { t1: { name: "walk" } });
});

test("a pool item: the window's picks and name go to its record, no line", async () => {
  const files = vault({ [MASTER]: "- [ ] t2\n" }, { t1: { name: "water herbs", pool: true } });
  await editTaskModal(taskStore.pool[0], async was => (assert.equal(was.name, "water herbs"), { ...PICK, name: "feed herbs" }));
  assert.deepEqual(json(files).t1, { name: "feed herbs", pool: true, difficulty: "#⭐easy", area: "#area/body", time: "evening", sticker: "a.webp" });
  assert.equal(files[MASTER], "- [ ] t2\n");
});

test("a new task: a new name gets a new id, a past name its old one; the line goes on top", async () => {
  const files = vault({ [MASTER]: "- [ ] t4 [due:: 2026-11-03]\n" }, { t4: { name: "walk", goal: null, tags: [] } });
  await saveNewTask("stretch", PICK, "- [ ] stretch [created:: 2026-11-02] [due:: 2026-11-06]");
  assert.equal(files[MASTER], "- [ ] t5 [created:: 2026-11-02] [due:: 2026-11-06]\n- [ ] t4 [due:: 2026-11-03]\n");
  assert.deepEqual(json(files).t5, { name: "stretch", difficulty: "#⭐easy", area: "#area/body", time: "evening", goal: null, tags: [], sticker: "a.webp", after: null });
  taskStore.putRecords(json(files));
  await saveNewTask("Walk", PICK, "- [ ] Walk [created:: 2026-11-02]");
  assert.match(files[MASTER], /^- \[ \] t4 \[created:: 2026-11-02\]\n/);
  assert.equal(Object.keys(json(files)).length, 2);
});

test("a new task to the pool: a record with pool: true, no line", async () => {
  const files = vault({ [MASTER]: "- [ ] t1\n" });
  assert.equal(await saveNewTask("water herbs", { ...PICK, pool: true }, "- [ ] water herbs [created:: 2026-11-02]"), true);
  assert.deepEqual(json(files).t1.pool, true);
  assert.equal(files[MASTER], "- [ ] t1\n");
});

test("a pool item dropped on a day: its id in a new open line", async () => {
  const files = vault({ [MASTER]: "- [ ] t9\n" }, { t1: { name: "water herbs", pool: true } });
  await makeActions({ today: "2026-11-02" }).fromPool(taskStore.pool[0], "2026-11-04", false);
  assert.equal(files[MASTER], "- [ ] t1 [created:: 2026-11-02] [due:: 2026-11-04]\n- [ ] t9\n");
});

test("a purchase's cost is the line's last number, not one in its name", async () => {
  const files = vault({ [MASTER]: "- [x] t1\n", [BUY]: "# Purchases\n\n- 2026-10-01 | 1984 | 2\n" }, RECS);
  assert.equal(await logPurchase("Candy", 3), true);   // 5 earned − 2 spent = 3
  assert.match(files[BUY], /Candy/);
});

test("two purchases at once: the second sees the first (10 gold, two for 10: one goes through)", async () => {
  const files = vault({ [MASTER]: "- [x] t1\n- [x] t1\n" }, RECS);
  const [one, two] = await Promise.all([logPurchase("Tea", 10), logPurchase("Cake", 10)]);
  assert.deepEqual([one, two], [true, false]);
  assert.doesNotMatch(files[BUY], /Cake/);
});

test("a purchase for 2.5 counts 2.5", async () => {
  const files = vault({ [MASTER]: "- [x] t1\n", [BUY]: "# Purchases\n\n- 2026-10-01 | Tea | 2.5\n" }, RECS);
  assert.equal(await logPurchase("Cake", 3), false);   // 5 − 2.5 = 2.5
  assert.equal(await logPurchase("Gum", 2.5), true);
  assert.match(files[BUY], /Gum \| 2\.5/);
});

test("a purchase for 1 000 (a space in it) counts 1000", async () => {
  vault({ [MASTER]: "- [x] t3\n", [BUY]: "# Purchases\n\n- 2026-10-01 | Tea | 1 000\n" }, RECS);
  assert.equal(await logPurchase("Gum", 1), false);   // 25 − 1000
});
