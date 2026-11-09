import { test } from "node:test";
import assert from "node:assert/strict";
import { setApp } from "#/helpers/app.js";
import { logPurchase } from "#/controllers/widgets/shop.js";
import { addTask, addPoolLine } from "#/controllers/tasks.js";
import { taskStore } from "#/store/tasks.js";

const later = () => new Promise(r => setTimeout(r, 5));
// a vault in memory: its task notes in the store (done tasks earn gold) and Purchases' lines through a
// Dataview
const vault = (files = {}, records = {}) => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-02" }) };
  const lines = prefix => Object.entries(files).filter(([p]) => p.startsWith(prefix)).flatMap(([, t]) => t.split("\n"))
    .filter(l => /^- /.test(l)).map(l => ({ text: l.replace(/^- /, "") }));

  for (const [p, text] of Object.entries(files)) if (p.startsWith("00 System/Data/Tasks/")) taskStore.put(p, text);
  taskStore.putRecords(records);
  setApp({
    plugins: { plugins: { dataview: { api: { pages: src => ({ file: { lists: lines(src.slice(1, -1)) } }) } } } },
    vault: {
      getFileByPath: p => p in files ? { path: p } : null,
      getFolderByPath: () => ({}),
      // a write lands a moment later, like a real one (and Dataview sees it later still)
      process: async (f, fn) => { await later(); files[f.path] = fn(files[f.path]); },
      read: async f => files[f.path],
      create: async (p, text) => { await later(); files[p] = text; },
    },
  });
  return files;
};
// done tasks' records: their difficulty is their gold
const RECS = { t1: { difficulty: "#⭐⭐medium" }, t2: { difficulty: "#⭐easy" }, t3: { difficulty: "#⭐⭐⭐⭐epic" } };
const MASTER = "00 System/Data/Tasks/Master.md", POOL = "00 System/Data/Tasks/Pool.md", BUY = "00 System/Data/Purchases.md";

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

test("a pool line goes to the end of Pool.md, made with its header on first use", async () => {
  const files = vault({});
  await addPoolLine("- #⭐easy water the herbs");
  assert.match(files[POOL], /^Tasks to pick when it's time.*\n\n- #⭐easy water the herbs\n$/);
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
