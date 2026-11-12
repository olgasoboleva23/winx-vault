import { test } from "node:test";
import assert from "node:assert/strict";
import { parseNote } from "#/models/taskFile.js";
import { setApp } from "#/helpers/app.js";
import { taskStore, useTaskStore, stageTasks, records } from "#/store/tasks.js";

const P = "00 System/Data/Tasks/Master.md", J = "00 System/Data/Tasks/tasks.json";

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
      getFileByPath: p => p in files ? { path: p, extension: p.split(".").pop() } : null,
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

test("the store reads Master.md and tasks.json once the layout is ready: tasks with their records, the pool, ready, a version", async () => {
  const { layout } = vault({
    [P]: "- [ ] t1 [due:: 2026-11-09]\n- [x] t2\n- [ ] t9",
    [J]: JSON.stringify({ t1: { name: "a" }, t2: { name: "b" }, t3: { name: "pick me", pool: true } }),
    "00 System/Data/Tasks/Pool.md": "- old pool line", "00 System/Data/Tasks/Master (old).md": "- [ ] old",
  }, false);
  useTaskStore(plugin());
  assert.equal(taskStore.ready, false);
  const was = taskStore.version.value;
  layout.forEach(fn => fn()); await settle();
  assert.equal(taskStore.ready, true);
  assert.deepEqual(taskStore.tasks.map(t => [t.text, t.rec?.name ?? null]), [["t1 [due:: 2026-11-09]", "a"], ["t2", "b"], ["t9", null]]);
  assert.equal(taskStore.records.get("t3").name, "pick me");
  assert.deepEqual(taskStore.pool, [{ id: "t3", pool: true, rec: taskStore.records.get("t3"), path: J }]);
  assert.ok(taskStore.version.value > was);
});

test("at a start the cache's first \"resolved\" is enough: onLayoutReady may never call back", async () => {
  const { fire } = vault({ [P]: "- [ ] a" }, false);
  useTaskStore(plugin());
  fire("resolved"); await settle();
  assert.equal(taskStore.ready, true);
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["a"]);
});

test("Master.md or tasks.json saved, made, deleted or renamed: read again, the version moves; another note of the folder: nothing", async () => {
  const { files, fire } = vault({ [P]: "- [ ] t1", [J]: "{}" });
  useTaskStore(plugin()); await settle();
  const v = () => taskStore.version.value, name = () => taskStore.tasks.map(t => t.rec?.name ?? t.text);
  let was = v();
  files[P] = "- [ ] t1\n- [ ] t2"; fire("modify", P); await settle();
  assert.deepEqual(name(), ["t1", "t2"]); assert.ok(v() > was); was = v();
  files[J] = JSON.stringify({ t2: { name: "b" } }); fire("modify", J); await settle();
  assert.deepEqual(name(), ["t1", "b"]); assert.ok(v() > was); was = v();
  fire("modify", "Notes/other.md"); await settle();
  files["00 System/Data/Tasks/More.md"] = "- [ ] c"; fire("create", "00 System/Data/Tasks/More.md"); await settle();
  assert.equal(v(), was);
  assert.deepEqual(name(), ["t1", "b"]);
  delete files[P]; fire("delete", P); await settle();
  assert.deepEqual(taskStore.tasks, []);
  files[P] = "- [ ] t2"; fire("rename", P); await settle();
  assert.deepEqual(name(), ["b"]);
});

test("a tasks.json that isn't JSON: the records stay as they were, an error is logged", async () => {
  const { files, fire } = vault({ [P]: "- [ ] t1", [J]: JSON.stringify({ t1: { name: "a" } }) });
  useTaskStore(plugin()); await settle();
  const error = console.error, logged = [];
  console.error = (...a) => logged.push(a);
  files[J] = "{ half"; fire("modify", J); await settle();
  console.error = error;
  assert.equal(taskStore.tasks[0].rec.name, "a");
  assert.equal(logged.length, 1);
});

test("putRecords: the records set straight, every task's record attached again", () => {
  vault({});
  taskStore.put(P, "- [ ] t1\n- [ ] t2 [due:: 2026-11-09]");
  const was = taskStore.version.value;
  taskStore.putRecords({ t2: { name: "b" }, t5: { name: "e", pool: true } });
  assert.deepEqual(taskStore.tasks.map(t => t.rec), [null, { name: "b" }]);
  assert.deepEqual(taskStore.pool.map(p => p.id), ["t5"]);
  assert.ok(taskStore.version.value > was);
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
  let release;
  app.vault.cachedRead = f => f.path === P
    ? new Promise(r => { release = () => r("- [ ] c"); }) : Promise.resolve(files[f.path]);
  files[P] = "- [ ] c"; fire("modify", P); await settle();
  delete files[P]; fire("delete", P); await settle();
  release(); await settle();
  assert.deepEqual(taskStore.tasks, []);
});

test("a note deleted and made again while its old read is on the way: the old read lands last, the new text stays", async () => {
  const { files, fire, app } = vault({});
  useTaskStore(plugin()); await settle();
  let release;
  app.vault.cachedRead = f => release ? Promise.resolve(files[f.path])
    : new Promise(r => { release = () => r("- [ ] old"); });
  files[P] = "- [ ] old"; fire("create", P); await settle();
  delete files[P]; fire("delete", P); await settle();
  files[P] = "- [ ] new"; fire("create", P); await settle();
  release(); await settle();
  assert.deepEqual(taskStore.tasks.map(t => t.text), ["new"]);
});

test("parseNote: a ~~~ block and an indented fence are examples too", () => {
  const text = "- [ ] a\n~~~\n- [x] b\n~~~\n  ```\n- [x] c\n  ```\n- [ ] d";
  assert.deepEqual(parseNote(P, text).map(i => i.text), ["a", "d"]);
});

test("a note deleted while the first read is on the way: it doesn't come back", async () => {
  const { files, fire, app, layout } = vault({ [P]: "- [ ] a" }, false);
  let release;

  app.vault.cachedRead = f => f.path === P
    ? new Promise(r => { release = () => r("- [ ] a"); }) : Promise.resolve(files[f.path]);
  useTaskStore(plugin());
  layout.forEach(fn => fn()); await settle();
  delete files[P]; fire("delete", P); await settle();
  release(); await settle();
  assert.deepEqual(taskStore.tasks, []);
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

const PJ = "00 System/Data/Projects/projects.json";
const stage = tasks => ({ p: { name: "Tea garden", stages: [{ name: "A", tasks }] } });

test("the store reads projects.json: projects in file order, inProject holds every stage's ids", async () => {
  vault({
    [PJ]: JSON.stringify({
      p1: { name: "Tea garden", stages: [{ name: "A", tasks: ["t1", "t2"] }] },
      p2: { name: "Shelf", stages: [{ name: "B", tasks: ["t2", "t3"] }] },
    }),
  });
  useTaskStore(plugin()); await settle();
  assert.deepEqual([...taskStore.projects.keys()], ["p1", "p2"]);
  assert.deepEqual(taskStore.inProject, new Set(["t1", "t2", "t3"]));
});

test("stageTasks: an open line is open, a done line with no open line is done, a skipped-only or missing id is left out", () => {
  vault({});
  taskStore.put(P, "- [ ] t1\n- [x] t2\n- [-] t3");
  const got = stageTasks({ name: "A", tasks: ["t1", "t2", "t3", "t9"] });
  assert.deepEqual(got.map(s => [s.id, s.done]), [["t1", false], ["t2", true]]);
});

test("stageTasks: a done 🔁 copy and its open next copy: open", () => {
  vault({});
  taskStore.put(P, "- [x] t4 [repeat:: every day when done] ✅ 2026-11-10\n- [ ] t4 [repeat:: every day when done] [due:: 2026-11-12]");
  const got = stageTasks({ name: "A", tasks: ["t4", "t4"] });
  assert.equal(got.length, 1);
  assert.equal(got[0].done, false);
  assert.equal(got[0].t.status, " ");
});

test("projects.json that isn't JSON leaves the projects as they were; a deleted one empties them", async () => {
  const { files, fire } = vault({ [PJ]: JSON.stringify(stage(["t1"])) });
  useTaskStore(plugin()); await settle();
  const error = console.error;
  console.error = () => {};
  files[PJ] = "{ half"; fire("modify", PJ); await settle();
  console.error = error;
  assert.deepEqual([...taskStore.projects.keys()], ["p"]);
  assert.deepEqual(taskStore.inProject, new Set(["t1"]));
  delete files[PJ]; fire("delete", PJ); await settle();
  assert.equal(taskStore.projects.size, 0);
  assert.equal(taskStore.inProject.size, 0);
});

test("a project without stages, or a stage without tasks: no throw, projects and inProject agree", () => {
  vault({});
  taskStore.putProjects({ p1: { name: "x" }, p2: { name: "y", stages: [{ name: "A" }, { name: "B", tasks: ["t1"] }] } });
  assert.deepEqual([...taskStore.projects.keys()], ["p1", "p2"]);
  assert.deepEqual(taskStore.inProject, new Set(["t1"]));
  assert.deepEqual(stageTasks({ name: "A" }), []);
});

test("the store's records are the collection's current Map", () => {
  vault({});
  taskStore.putRecords({ t1: { name: "a" } });
  assert.equal(taskStore.records, records.records);
  records.load({ t2: {} });
  assert.ok(taskStore.records.has("t2"));
});

test("a projects.json that throws while read leaves the projects and the store as they were", () => {
  vault({});
  taskStore.putProjects({ p1: { stages: [{ tasks: ["t1"] }] } });
  assert.throws(() => taskStore.putProjects({ p1: null }));
  assert.ok(taskStore.projects.has("p1"));
  assert.ok(taskStore.projects.get("p1"));
  assert.ok(taskStore.inProject.has("t1"));
  taskStore.put(P, "- [ ] t1");
  assert.equal(taskStore.tasks.length, 1);
});

test("a tasks.json with a null record leaves the records and the store as they were", () => {
  vault({});
  taskStore.putRecords({ t1: { name: "a" } });
  assert.throws(() => taskStore.putRecords({ t1: null }));
  assert.equal(taskStore.records.get("t1").name, "a");
  taskStore.put(P, "- [ ] t1");
  assert.equal(taskStore.tasks.length, 1);
});
