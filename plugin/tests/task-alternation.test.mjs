import { test, before as beforeTests } from "node:test";
import assert from "node:assert/strict";
import { nextVariantAfter } from "#/models/taskAlternation.js";
import { Task } from "#/models/task.js";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { MASTER, TASK_RECORDS } from "#/helpers/paths.js";
import { Notice } from "obsidian";

const record = { name: "Training", variants: ["Core", "Arms"], currVariant: "Core", goal: "workout" };
const rule = "[repeat:: every week on Monday, Wednesday, Friday when done]";
const before = `- [ ] t1 ${rule} [due:: 2026-11-11]`;
const done = `- [x] t1 ${rule} [due:: 2026-11-11] [completion:: 2026-11-11]`;
const next = `- [ ] t1 ${rule} [due:: 2026-11-13]`;
const completed = `${next}\n${done}`;
let taskStore, tickTask, editTaskModal, saveNewTask, makeActions;
beforeTests(async () => {
  GlobalRegistrator.register();
  ({ taskStore } = await import("#/store/tasks.js"));
  ({ tickTask, editTaskModal, saveNewTask } = await import("#/controllers/tasks.js"));
  ({ makeActions } = await import("#/controllers/calendar.js"));
});
function setup(text = before) {
  const v = vault({ [MASTER]: text, [TASK_RECORDS]: JSON.stringify({ t1: record }) });
  const api = {
    executeToggleTaskDoneCommand: () => completed,
    editTaskLineModal: async () => completed.replaceAll("t1", "Training"),
  };
  v.app.plugins.plugins["obsidian-tasks-plugin"] = { apiV1: api };
  taskStore.put(MASTER, text);
  taskStore.putRecords({ t1: { ...record } });
  return { ...v, api, task: taskStore.tasks[0] };
}
const rec = v => JSON.parse(v.files[TASK_RECORDS]).t1;
const update = (v, patch) => { v.files[TASK_RECORDS] = JSON.stringify({ t1: { ...rec(v), ...patch } }); };
const failRecordsOnce = v => {
  const process = v.app.vault.process;
  let fail = true;
  v.app.vault.process = async (file, fn) => {
    if (file.path === TASK_RECORDS && fail) { fail = false; throw new Error("disk"); }
    return process(file, fn);
  };
};

test("The completion chooses the next JSON variant, wrapping at the end", () => {
  assert.equal(nextVariantAfter(before, completed, record), "Arms");
  assert.equal(nextVariantAfter(before, completed, { ...record, currVariant: "Arms" }), "Core");
  assert.equal(nextVariantAfter(before, completed, { ...record, variants: ["Core", "Arms", "Legs"], currVariant: "Arms" }), "Legs");
  assert.throws(() => nextVariantAfter(before, completed, { ...record, currVariant: "Missing" }), /variant/i);
});

test("Skip, reopening and date edits preserve the queue", async () => {
  const v = setup();
  await makeActions({ today: "2026-11-11", TASKS: v.api }).skip(v.task);
  assert.equal(rec(v).currVariant, "Core");
  assert.equal(v.files[MASTER], Task.skipLines(completed));
  assert.equal(nextVariantAfter(done, before, record), null);
  assert.equal(nextVariantAfter(before, next, record), null);
});

test("Tick preserves native Tasks output and changes the queue; undo restores both once", async () => {
  const v = setup();
  await tickTask(v.task);
  assert.equal(v.files[MASTER], completed);
  assert.equal(rec(v).currVariant, "Arms");
  const undo = Notice.last.querySelector("button").onclick;
  await undo(); await undo();
  assert.equal(v.files[MASTER], before);
  assert.deepEqual(rec(v), record);
});

test("Later log edits or queue edits prevent undo from changing either file", async () => {
  let v = setup();
  await tickTask(v.task);
  let undo = Notice.last.querySelector("button").onclick;
  v.files[MASTER] = completed.replace("2026-11-13", "2026-11-16");
  await undo();
  assert.equal(v.files[MASTER], completed.replace("2026-11-13", "2026-11-16"));
  assert.equal(rec(v).currVariant, "Arms");
  v = setup(); await tickTask(v.task);
  undo = Notice.last.querySelector("button").onclick;
  update(v, { currVariant: "Core" });
  await undo();
  assert.equal(v.files[MASTER], completed);
  assert.equal(rec(v).currVariant, "Core");
});

test("Record failure rolls back completion; failed undo restores completion and can be retried", async () => {
  let v = setup(); failRecordsOnce(v);
  await assert.rejects(() => tickTask(v.task), /disk/);
  assert.equal(v.files[MASTER], before);
  assert.equal(rec(v).currVariant, "Core");
  v = setup(); await tickTask(v.task);
  const undo = Notice.last.querySelector("button").onclick;
  failRecordsOnce(v);
  await assert.rejects(() => undo(), /disk/);
  assert.equal(v.files[MASTER], completed);
  assert.equal(rec(v).currVariant, "Arms");
  await undo();
  assert.equal(v.files[MASTER], before);
  assert.equal(rec(v).currVariant, "Core");
});

test("A log write failure and two simultaneous clicks cannot advance the queue twice", async () => {
  let v = setup();
  const process = v.app.vault.process;
  v.app.vault.process = async (file, fn) => {
    if (file.path === MASTER) throw new Error("log disk");
    return process(file, fn);
  };
  await assert.rejects(() => tickTask(v.task), /log disk/);
  assert.equal(rec(v).currVariant, "Core");
  v = setup();
  await Promise.all([tickTask(v.task), tickTask(v.task)]);
  assert.equal(v.files[MASTER], completed);
  assert.equal(rec(v).currVariant, "Arms");
});

test("Backdated calendar completion keeps Wednesday and advances the same JSON queue", async () => {
  const v = setup();
  await makeActions({ today: "2026-11-11", TASKS: v.api }).place(v.task, "2026-11-10", true);
  assert.equal(new Task(v.files[MASTER].split("\n")[0]).date, "2026-11-11");
  assert.equal(rec(v).currVariant, "Arms");
});

test("Another open occurrence or stale completion cannot start an extra chain", async () => {
  let v = setup(`${before}\n${next}`);
  await tickTask(v.task);
  assert.match(Notice.last, /another open copy/);
  assert.equal(v.files[MASTER], `${before}\n${next}`);
  assert.equal(rec(v).currVariant, "Core");
  v = setup(); v.files[MASTER] = done;
  await tickTask(v.task);
  assert.equal(v.files[MASTER], done);
  assert.equal(rec(v).currVariant, "Core");
});

test("A tasks.json that isn't valid JSON: a tick says so and writes nothing", async () => {
  const v = setup();
  v.files[TASK_RECORDS] = "broken";
  await tickTask(v.task);
  assert.match(Notice.last, /tasks\.json isn't valid JSON/);
  assert.equal(v.files[MASTER], before);
});

test("Open tasks use the current name; training history always uses the common name", () => {
  assert.equal(new Task(before, null, record).text, "Training · Core");
  assert.equal(new Task(before, null, { ...record, currVariant: "Arms" }).text, "Training · Arms");
  assert.equal(new Task(done, null, record).text, "Training");
  assert.equal(new Task(done, null, { ...record, currVariant: "Arms" }).text, "Training");
  assert.equal(new Task(Task.skipLines(done), null, record).text, "Training");
});

test("The editor saves its selection in JSON and leaves the Tasks log unchanged", async () => {
  const v = setup(`${before}\n${done}`);
  let shown;
  v.api.editTaskLineModal = async line => (shown = line);
  await editTaskModal(v.task, async preset => ({ ...preset, currVariant: "Arms" }));
  assert.equal(new Task(shown).words, "Training");
  assert.equal(v.files[MASTER], `${before}\n${done}`);
  assert.equal(rec(v).currVariant, "Arms");
  assert.equal(rec(v).name, "Training");
});

test("Completion in the editor rotates from its selected variant", async () => {
  const v = setup();
  await editTaskModal(v.task, async preset => ({ ...preset, currVariant: "Arms" }));
  assert.equal(v.files[MASTER], completed);
  assert.equal(rec(v).currVariant, "Core");
});

test("Cancellation, concurrent record edits and failed modal saves preserve both files", async () => {
  let v = setup(); v.api.editTaskLineModal = async () => "";
  await editTaskModal(v.task, async preset => ({ ...preset, currVariant: "Arms" }));
  assert.equal(v.files[MASTER], before); assert.deepEqual(rec(v), record);
  v.api.editTaskLineModal = async line => { update(v, { variants: ["Core", "Legs"] }); return line; };
  await editTaskModal(v.task, async preset => ({ ...preset, currVariant: "Arms" }));
  assert.equal(v.files[MASTER], before); assert.deepEqual(rec(v).variants, ["Core", "Legs"]);
  v = setup(); failRecordsOnce(v);
  await assert.rejects(() => editTaskModal(v.task, async preset => ({ ...preset, currVariant: "Arms" })), /disk/);
  assert.equal(v.files[MASTER], before); assert.deepEqual(rec(v), record);
});

test("Creating a recurring task already done advances its JSON queue once", async () => {
  const { files } = vault({ [MASTER]: "", [TASK_RECORDS]: "{}" });
  await saveNewTask("Training", { variants: ["Core", "Arms"], currVariant: "Arms", difficulty: "easy", area: "body" },
    completed.replaceAll("t1", "Training"));
  assert.equal(files[MASTER], `${completed}\n`);
  assert.equal(JSON.parse(files[TASK_RECORDS]).t1.currVariant, "Core");
});

test("A failed new-task save leaves the previous log and queue intact", async () => {
  const v = setup(done); failRecordsOnce(v);
  await assert.rejects(() => saveNewTask("Training", { ...record, currVariant: "Arms" }, completed.replaceAll("t1", "Training")), /disk/);
  assert.equal(v.files[MASTER], done);
  assert.deepEqual(rec(v), record);
});

test("Task window validates duplicate names and an unavailable choice", async () => {
  const { Form } = await import("#/components/uikit/Form/index.ts");
  const { taskWindow } = await import("#/components/uikit/TaskWindow/index.js");
  const ask = Form.ask;
  const values = [
    { variantsText: "Core\nCore", currVariant: "Core" },
    { variantsText: "Core\nArms", currVariant: "Missing" },
    { variantsText: "Core\nArms", currVariant: "Arms" },
  ];
  vault(); Form.ask = async () => values.shift();
  try {
    const pick = await taskWindow();
    assert.deepEqual(pick.variants, ["Core", "Arms"]);
    assert.equal(pick.currVariant, "Arms");
    assert.equal(values.length, 0);
  } finally { Form.ask = ask; }
});


test("Two backdated clicks on an unchanged upcoming date advance the queue only once", async () => {
  const v = setup();
  const actions = makeActions({ today: "2026-11-11", TASKS: v.api });
  await Promise.all([actions.place(v.task, "2026-11-10", true), actions.place(v.task, "2026-11-10", true)]);
  assert.equal(rec(v).currVariant, "Arms");
  assert.equal(v.files[MASTER].split("\n").filter(l => new Task(l).isDone).length, 1);
});

test("A record changed during the log write wins and the pending completion is rolled back", async () => {
  const v = setup();
  const process = v.app.vault.process;
  let first = true;
  v.app.vault.process = async (file, fn) => {
    await process(file, fn);
    if (file.path === MASTER && first) { first = false; update(v, { currVariant: "Arms", sticker: "new.webp" }); }
  };
  await tickTask(v.task);
  assert.equal(v.files[MASTER], before);
  assert.equal(rec(v).currVariant, "Arms");
  assert.equal(rec(v).sticker, "new.webp");
});
