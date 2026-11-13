import { test } from "node:test";
import assert from "node:assert/strict";
import { Notice } from "obsidian";
import { vault } from "./stubs/vault.mjs";
import { taskStore } from "#/store/tasks.js";
import { PROJECTS } from "#/helpers/paths.js";
import {
  createProject, saveProject, addStage, addToStage, toCalendar, askNewProject,
} from "#/controllers/projects.js";

const MASTER = "00 System/Data/Tasks/Master.md";
const RECORDS = "00 System/Data/Tasks/tasks.json";
const json = files => JSON.parse(files[PROJECTS]);

test("createProject: p1 then p2, the full shape, status active by default", async () => {
  const { files } = vault();
  assert.equal(await createProject({ name: "Garden", description: "beds" }), "p1");
  assert.equal(await createProject({ name: "Shed", status: "idea", cover: "a.webp" }), "p2");
  assert.deepEqual(json(files).p1, {
    name: "Garden", status: "active", description: "beds", result: "", notes: "",
    cover: null, stages: [],
  });
  assert.equal(json(files).p2.status, "idea");
  assert.equal(json(files).p2.cover, "a.webp");
});

test("saveProject merges fields and keeps the rest", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await saveProject("p1", { notes: "x" });
  assert.equal(json(files).p1.notes, "x");
  assert.equal(json(files).p1.name, "Garden");
});

test("addStage appends", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await addStage("p1", "A");
  await addStage("p1", "B");
  assert.deepEqual(json(files).p1.stages, [{ name: "A", tasks: [] }, { name: "B", tasks: [] }]);
});

test("saveProject and addStage on a missing key write nothing", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  const before = files[PROJECTS];
  await saveProject("p9", { notes: "x" });
  assert.equal(await addStage("p9", "A"), false);
  assert.equal(files[PROJECTS], before);
});

test("addToStage: lists the id once; null or a changed stage writes nothing", async () => {
  const { files } = vault();
  await createProject({ name: "Garden" });
  await addStage("p1", "A");
  assert.equal(await addToStage("p1", 0, "A", async () => "t7"), "t7");
  await addToStage("p1", 0, "A", async () => "t7");
  assert.deepEqual(json(files).p1.stages[0].tasks, ["t7"]);

  const before = files[PROJECTS];
  assert.equal(await addToStage("p1", 0, "A", async () => null), null);
  assert.equal(await addToStage("p1", 0, "Z", async () => "t8"), null);
  assert.match(Notice.last, /project changed/);
  assert.equal(files[PROJECTS], before);
});

test("toCalendar puts the task on a day", async () => {
  const { files } = vault({ [MASTER]: "- [ ] t1\n", [RECORDS]: '{"t1":{"name":"walk"}}' });
  taskStore.put(MASTER, files[MASTER]);
  taskStore.putRecords({ t1: { name: "walk" } });
  await toCalendar(taskStore.tasks[0], "2026-11-12");
  assert.equal(files[MASTER], "- [ ] t1 [due:: 2026-11-12]\n");
});

test("askNewProject opens the Winx tab on the new project", async () => {
  const { files, app } = vault();
  const seen = [];
  const open = async (...a) => seen.push(a);
  const ask = async (_app, _title, _rows, o) => {
    assert.equal(o.values.status, "active");
    return { name: "Garden", description: "beds", status: "idea", cover: true };
  };

  assert.equal(await askNewProject(app, ask, async () => "03 Resources/Media/a.webp", open), "p1");
  assert.deepEqual(json(files).p1.cover, "03 Resources/Media/a.webp");
  assert.equal(json(files).p1.status, "idea");
  assert.deepEqual(seen, [["projects", { open: "p1" }]]);

  assert.equal(await askNewProject(app, async () => null), null);
  assert.deepEqual(Object.keys(json(files)), ["p1"]);
});

test("a null project in projects.json: saveProject and addStage write nothing, addToStage null", async () => {
  const { files } = vault({ [PROJECTS]: '{"p1":null}' });
  assert.equal(await saveProject("p1", { notes: "x" }), false);
  assert.equal(await addStage("p1", "A"), false);
  assert.equal(await addToStage("p1", 0, "A", async () => "t7"), null);
  assert.equal(files[PROJECTS], '{"p1":null}');
});
