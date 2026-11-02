import { test } from "node:test";
import assert from "node:assert/strict";
import { setApp } from "../src/core/app.js";
import { logPurchase } from "../src/widgets/shop/wallet.js";
import { addTask, addPoolLine } from "../src/tasks/master.js";

// a vault in memory and a Dataview whose pages are its tasks (done ones earn gold) and Purchases' lines
const vault = (files = {}) => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-02" }) };
  const lines = (prefix, task) => Object.entries(files).filter(([p]) => p.startsWith(prefix)).flatMap(([, t]) => t.split("\n"))
    .filter(l => task ? /^- \[.\]/.test(l) : /^- /.test(l))
    .map(l => ({ text: l.replace(/^- (\[.\] )?/, ""), completed: /^- \[x\]/.test(l), tags: l.match(/#\S+/g) ?? [] }));
  setApp({
    plugins: { plugins: { dataview: { api: { pages: src => ({ file: {
      tasks: lines(src.slice(1, -1), true), lists: lines(src.slice(1, -1), false) } }) } } } },
    vault: {
      getFileByPath: p => p in files ? { path: p } : null,
      getFolderByPath: () => ({}),
      process: async (f, fn) => { files[f.path] = fn(files[f.path]); },
      create: async (p, text) => { files[p] = text; },
    },
  });
  return files;
};
const MASTER = "00 System/Data/Tasks/Master.md", POOL = "00 System/Data/Tasks/Pool.md", BUY = "00 System/Data/Purchases.md";

test("a purchase is logged only when the gold covers it", async () => {
  const files = vault({ [MASTER]: "- [x] #⭐⭐medium #area/base laundry\n- [x] #⭐easy #area/base dishes\n", [BUY]: "# Purchases\n\n- 2026-10-01 | Tea | 3\n" });
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
