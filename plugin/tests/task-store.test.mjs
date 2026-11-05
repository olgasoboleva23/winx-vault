import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNote } from "#/models/taskFile.js";
import { setApp } from "#/helpers/app.js";
import { taskStore, useTaskStore } from "#/store/tasks.js";

const P = "00 System/Data/Tasks/Master.md";

test("parseNote: the list items of a note: tasks (status, text, line) and plain lines (no status)", () => {
  const items = parseNote(P, "# Tasks\n\n- [ ] #area/body walk 📅 2026-11-04\n- [x] tea ✅ 2026-11-03\n- [-] skipped\nnot a list\n- a plain line\n* [ ] not ours");
  assert.deepEqual(items.map(i => [i.line, i.status, i.text]), [
    [2, " ", "#area/body walk 📅 2026-11-04"], [3, "x", "tea ✅ 2026-11-03"], [4, "-", "skipped"], [6, null, "a plain line"],
  ]);
  assert.ok(items.every(i => i.path === P && i.parent === undefined));
});

test("parseNote: an indented item has its parent's line; a blank or plain line ends the nesting", () => {
  const items = parseNote(P, "- [ ] plan\n  - [ ] step\n    - note\n  - [ ] step 2\n- [ ] other\n\n  - [ ] orphan");
  assert.deepEqual(items.map(i => [i.line, i.parent]), [[0, undefined], [1, 0], [2, 1], [3, 0], [4, undefined], [6, undefined]]);
});

// a vault in memory: the Tasks folder's notes, their reads, and the events a listener gets
const vault = (files, ready = true) => {
  const events = {}, layout = [];
  setApp({
    metadataCache: { on: (name, fn) => { (events[name] ??= []).push(fn); return { name }; } },
    vault: {
      getFolderByPath: p => p === "00 System/Data/Tasks"
        ? { children: Object.keys(files).map(path => ({ path, extension: path.split(".").pop() })) } : null,
      cachedRead: async f => files[f.path],
      on: (name, fn) => { (events[name] ??= []).push(fn); return { name }; },
    },
    workspace: { onLayoutReady: fn => ready ? fn() : layout.push(fn) },
  });
  const fire = (name, path) => events[name].forEach(fn => fn({ path }));
  return { files, fire, layout };
};
const plugin = () => ({ registerEvent() {}, register() {} });
const settle = () => new Promise(r => setTimeout(r, 5));

test("the store reads the folder's notes once the layout is ready: tasks and the pool's lines, ready, a version", async () => {
  const { layout } = vault({ [P]: "- [ ] a\n- [x] b", "00 System/Data/Tasks/Pool.md": "intro\n\n- pick me", "00 System/Data/Tasks/x.png": "" }, false);
  useTaskStore(plugin());
  assert.equal(taskStore.ready, false);
  const was = taskStore.version.value;
  layout.forEach(fn => fn()); await settle();
  assert.equal(taskStore.ready, true);
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a", "b"]);
  assert.deepEqual(taskStore.pool.map(t => t.text), ["pick me"]);
  assert.ok(taskStore.version.value > was);
});

test("at a start the cache's first \"resolved\" is enough: onLayoutReady may never call back", async () => {
  const { fire } = vault({ [P]: "- [ ] a" }, false);
  useTaskStore(plugin());
  fire("resolved"); await settle();
  assert.equal(taskStore.ready, true);
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a"]);
});

test("a note in the folder saved, made, deleted or renamed: read again, the version moves; another note: nothing", async () => {
  const { files, fire } = vault({ [P]: "- [ ] a" });
  useTaskStore(plugin()); await settle();
  const v = () => taskStore.version.value;
  let was = v();
  files[P] = "- [ ] a\n- [ ] b"; fire("modify", P); await settle();
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a", "b"]); assert.ok(v() > was); was = v();
  fire("modify", "Notes/other.md"); await settle();
  assert.equal(v(), was);
  files["00 System/Data/Tasks/More.md"] = "- [ ] c"; fire("create", "00 System/Data/Tasks/More.md"); await settle();
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a", "b", "c"]);
  delete files["00 System/Data/Tasks/More.md"]; fire("delete", "00 System/Data/Tasks/More.md"); await settle();
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a", "b"]);
});

test("put(path, text): the note's items set straight (tests, and a write the plugin just made)", () => {
  vault({});
  taskStore.put(P, "- [ ] z");
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["z"]);
});
