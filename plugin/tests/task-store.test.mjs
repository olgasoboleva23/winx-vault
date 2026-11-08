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
  const app = {
    metadataCache: { on: (name, fn) => { (events[name] ??= []).push(fn); return { name }; } },
    vault: {
      getFolderByPath: p => p === "00 System/Data/Tasks"
        ? { children: Object.keys(files).map(path => ({ path, extension: path.split(".").pop() })) } : null,
      cachedRead: async f => files[f.path],
      on: (name, fn) => { (events[name] ??= []).push(fn); return { name }; },
    },
    workspace: { onLayoutReady: fn => ready ? fn() : layout.push(fn) },
  };

  setApp(app);
  const fire = (name, path) => events[name].forEach(fn => fn({ path }));
  return { files, fire, layout, app };
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

test("parseNote: a task inside a code block or an HTML comment is an example, not a task", () => {
  const text = "- [ ] a\n```\n- [x] b #hard\n```\n<!--\n- [ ] c\n-->\n- [ ] d <!-- e -->";
  assert.deepEqual(parseNote(P, text).map(i => i.text), ["a", "d <!-- e -->"]);
});

test("a read that fails at the start: the next \"resolved\" reads again (ready stays false till then)", async () => {
  const { fire, app } = vault({ [P]: "- [ ] a" }, false);
  const read = app.vault.cachedRead;
  app.vault.cachedRead = async () => { throw new Error("gone"); };
  taskStore.ready = false;   // a test before set it
  useTaskStore(plugin());
  const error = console.error;
  console.error = () => {};
  fire("resolved"); await settle();
  console.error = error;
  assert.equal(taskStore.ready, false);
  app.vault.cachedRead = read;
  fire("resolved"); await settle();
  assert.equal(taskStore.ready, true);
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a"]);
});

test("a note deleted while its read is still on the way: the late read is dropped, not put back", async () => {
  const { files, fire, app } = vault({ [P]: "- [ ] a" });
  useTaskStore(plugin()); await settle();
  const more = "00 System/Data/Tasks/More.md";
  let release;
  app.vault.cachedRead = f => f.path === more
    ? new Promise(r => { release = () => r("- [ ] c"); }) : Promise.resolve(files[f.path]);
  files[more] = "- [ ] c"; fire("create", more); await settle();
  delete files[more]; fire("delete", more); await settle();
  release(); await settle();
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a"]);
});

test("parseNote: a ~~~ block and an indented fence are examples too", () => {
  const text = "- [ ] a\n~~~\n- [x] b\n~~~\n  ```\n- [x] c\n  ```\n- [ ] d";
  assert.deepEqual(parseNote(P, text).map(i => i.text), ["a", "d"]);
});

test("a note deleted while the first read is on the way: it doesn't come back", async () => {
  const more = "00 System/Data/Tasks/More.md";
  const { files, fire, app, layout } = vault({ [P]: "- [ ] a", [more]: "- [ ] c" }, false);
  let release;

  app.vault.cachedRead = f => f.path === more
    ? new Promise(r => { release = () => r("- [ ] c"); }) : Promise.resolve(files[f.path]);
  useTaskStore(plugin());
  layout.forEach(fn => fn()); await settle();
  delete files[more]; fire("delete", more); await settle();
  release(); await settle();
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a"]);
});

test("turned on in an open Obsidian: a first read that fails is tried again at the next \"resolved\"", async () => {
  const { fire, app } = vault({ [P]: "- [ ] a" });
  const read = app.vault.cachedRead, error = console.error;

  app.workspace.layoutReady = true;
  app.vault.cachedRead = async () => { throw new Error("gone"); };
  taskStore.ready = false;
  console.error = () => {};
  useTaskStore(plugin()); await settle();
  console.error = error;
  assert.equal(taskStore.ready, false);
  app.vault.cachedRead = read;
  fire("resolved"); await settle();
  assert.equal(taskStore.ready, true);
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a"]);
});

test("put(path, text): the note's items set straight (tests, and a write the plugin just made)", () => {
  vault({});
  taskStore.put(P, "- [ ] z");
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["z"]);
});
