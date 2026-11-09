// The writes of tasks: a task's line rewritten where it is (found again by its words), with an undo
// notice; the task window (components/uikit/TaskWindow) and the Tasks plugin's edit dialog; a
// task's record in tasks.json; a new task on top of Master.md (to the pool: a record alone).
import { Notice } from "obsidian";
import { edit, editLine, undoLines } from "#/helpers/files.js";
import { tasksApi } from "#/helpers/plugins.js";
import { Task } from "#/models/task.js";
import { taskWindow } from "#/components/uikit/TaskWindow/index.js";
import { app } from "#/helpers/app.js";
import { migrate } from "#/models/taskMigration.js";
import { parseNote } from "#/models/taskFile.js";
import { MASTER, MASTER_OLD, POOL, POOL_OLD, TASK_RECORDS } from "#/helpers/paths.js";

// Rewrite a Dataview task's line in its file (fn returns the new line, null deletes it),
// only if that line is still the same copy of the task.
export const editTaskLine = (t, fn) =>
  editLine(t.path, t.line, line => new Task(line).sameAs(Task.of(t)), fn);

// The task window's picks as record fields: daytime "#time/morning" → "morning".
const recOf = p => ({
  difficulty: p.difficulty ?? null, area: p.area ?? null, daytime: p.daytime?.slice(6) ?? null,
  sticker: p.sticker ?? null,
});

// Merge a patch into tasks.json ({ id: fields } merges into the record, { id: null } deletes it),
// one write; the file is made when missing. Last writer wins (two devices, Remotely Save).
export async function saveRecords(patch) {
  const apply = text => {
    const all = text ? JSON.parse(text) : {};

    for (const [id, p] of Object.entries(patch))
      if (p === null) delete all[id]; else all[id] = { ...all[id], ...p };
    return JSON.stringify(all, null, 2);
  };

  if (app.vault.getFileByPath(TASK_RECORDS)) return edit(TASK_RECORDS, apply);
  await app.vault.create(TASK_RECORDS, apply(""));
}

// the next free id: the biggest one of the records and of the lines (a line whose record was lost
// to a sync conflict keeps its id) plus one
export const newId = (records, tasks = []) => {
  const ids = [...records.keys(), ...tasks.map(t => Task.of(t).id).filter(Boolean)];

  return `t${Math.max(0, ...ids.map(id => +id.slice(1))) + 1}`;
};

// Edit a task: the task window (difficulty, area, daytime, sticker: to its record), then the Tasks
// plugin's own edit dialog on its line with the name in place of the id (name: to the record,
// dates: to the line; works on the phone). Cancelling either changes nothing. A pool item has no
// line: the window alone, with its name. `ask` is the window (a test gives its own). A line changed
// meanwhile (another device): nothing saved.
export const editTaskModal = async (t, ask = taskWindow) => {
  const task = Task.of(t), id = task.id, api = tasksApi();
  let line = null;

  if (!t.pool) {
    const text = await app.vault.cachedRead(app.vault.getAbstractFileByPath(t.path));

    line = text.split("\n")[t.line];
    if (!api || !id || Task.keyOf(line ?? "") !== task.key) return;
  }

  const pick = await ask(t.pool ? { ...task.picks, name: task.text } : task.picks);

  if (!pick) return;
  const patch = { ...recOf(pick) };
  let next = line;

  if (t.pool) {
    if (pick.name) patch.name = pick.name;
  } else {
    const edited = await api.editTaskLineModal(new Task(line).named(task.text));

    // "" when cancelled
    if (!edited) return;
    const back = Task.unnamed(edited, id);

    patch.name = back.name || task.text;
    next = back.line;
  }

  // the line first, only over the very text read before the window (a 🔁 rule changed or a tick
  // meanwhile: nothing saved, editLine's notice); an unchanged line is checked the same way
  if (!t.pool && !await editLine(t.path, t.line, l => l === line, () => next)) return;
  await saveRecords({ [id]: patch });
};

// A new task from the New task command: `name` (a past task's, or a typed one), the window's
// picks, the Tasks dialog's result line. The name is the dialog's (its words may have been changed
// there). A past task (`oldId`) whose name is unchanged (case and spaces aside) reuses its id and
// record, and so does a name some record already has; any other name is a new task: a new id and
// a record. To the pool (pick.pool): a record with pool: true, no line; else the line (id, dates)
// on top of Master.md (false when Master.md is missing). One save at a time, the ids worked out
// from tasks.json and Master.md as they are on disk now (the store sees a write a moment later), so
// two saves at once never get one id.
let saving = Promise.resolve();

export function saveNewTask(...args) {
  const run = saving.then(() => saveNew(...args));

  saving = run.catch(() => {});
  return run;
}

// a note's text from disk ("" when it's missing)
const fromDisk = async path => {
  const file = app.vault.getFileByPath(path);

  return file ? app.vault.read(file) : "";
};

async function saveNew(name, pick, result, oldId = null) {
  const records = new Map(Object.entries(JSON.parse(await fromDisk(TASK_RECORDS) || "{}")));
  const tasks = parseNote(MASTER, await fromDisk(MASTER)).filter(i => i.status !== null);
  const final = Task.unnamed(result, "t0").name || name;
  const key = n => Task.keyOf(`- [ ] ${n}`);
  const same = id => key(records.get(id)?.name ?? "") === key(final);
  const old = same(oldId) ? oldId : [...records.keys()].find(same) ?? null;
  const id = old ?? newId(records, tasks);
  const back = Task.unnamed(result, id);

  await saveRecords({
    [id]: {
      ...old ? {} : { goal: null, tags: [], after: null },
      ...recOf(pick), name: final, ...pick.pool ? { pool: true } : {},
    },
  });
  return pick.pool ? true : addTask(back.line);
}

// Change a task's line like editTaskLine (fn may return several lines, or null to delete), then
// show a notice "<mark> <task>  undo" for 8 s; undo puts the old line back if the new lines are
// still there (once).
export const editTaskLineWithUndo = async (t, fn, mark) => {
  let before = null, after = null, around = null;
  await editTaskLine(t, (line, lines) => {
    before = line;
    around = { above: lines[t.line - 1], below: lines[t.line + 1] };
    return after = fn(line);
  });
  if (before === null) return;
  const added = after === null ? [] : after.split("\n");

  undoNotice(t, mark, undoLines(t.path, t.line, added, before, around));
};

// the notice "<mark> <task>  Undo" for 8 s
function undoNotice(t, mark, undo) {
  const frag = document.createDocumentFragment();

  frag.append(`${mark} ${Task.of(t).text.slice(0, 40)}  `);
  const button = frag.appendChild(document.createElement("button"));

  button.textContent = "Undo";
  button.onclick = undo;
  new Notice(frag, 8000);
}

// 🗑: the line deleted; a pool item (no line) taken out of the pool, its record and history kept
// (an undefined field is left out of the JSON)
export async function deleteTaskLine(t) {
  if (!t.pool) return editTaskLineWithUndo(t, () => null, "🗑");
  await saveRecords({ [t.id]: { pool: undefined } });
  undoNotice(t, "🗑", () => saveRecords({ [t.id]: { pool: true } }));
}

// a new task: the line on top of Master.md (false when Master.md is missing: nothing written); one
// place for the New task command and the calendar's pool drop
export async function addTask(line) {
  if (!app.vault.getFileByPath(MASTER)) return false;
  await edit(MASTER, c => line + "\n" + c);
  return true;
}

// Tick (or untick) a task through the Tasks plugin, so a 🔁 one gets its next copy
export const tickTask = t =>
  editTaskLineWithUndo(t, line => tasksApi().executeToggleTaskDoneCommand(line, t.path), "✓");

// The one-off move to the id format (the Migrate tasks command): not when tasks.json or an old
// copy is there, or Master.md is missing. The old notes kept as copies (Master.md is not renamed:
// a rename would rewrite links to it), then tasks.json, then Master.md rewritten last (a failed
// write before it leaves the old Master.md as it was), then Pool.md to the trash. Master.md or
// Pool.md changed meanwhile: it stops before the first write, or before the rewrite.
export async function migrateTasks() {
  const { vault, fileManager } = app;
  const master = vault.getFileByPath(MASTER), pool = vault.getFileByPath(POOL);
  const there = [TASK_RECORDS, MASTER_OLD, POOL_OLD].find(p => vault.getFileByPath(p));

  if (there) return void new Notice(`✦ ${there} exists`);
  if (!master) return void new Notice(`✦ ${MASTER} not found`);
  try {
    const masterText = await vault.read(master), poolText = pool ? await vault.read(pool) : "";
    const { master: next, records } = migrate(masterText, poolText);
    // Master.md or Pool.md changed since they were read (a sync, Tasks): migrating would lose it
    const changed = async () => await vault.read(master) !== masterText
      || (pool ? await vault.read(pool) : "") !== poolText;
    const stopped = "✦ migration stopped: Master.md changed while migrating";

    if (await changed()) return void new Notice(`${stopped} — run it again`);
    await vault.create(MASTER_OLD, masterText);
    if (pool) await vault.create(POOL_OLD, poolText);
    await vault.create(TASK_RECORDS, JSON.stringify(records, null, 2));
    if (await changed())
      return void new Notice(`${stopped} — delete tasks.json and the (old) copies, run it again`);

    await vault.modify(master, next);
    if (pool) await fileManager.trashFile(pool);
    const n = Object.keys(records).length;

    new Notice(`✦ ${n} tasks migrated: switch Tasks → Task format → Dataview`);
  } catch (e) {
    new Notice(`✦ migration stopped: ${e.message} — your old notes are in Master (old).md`);
  }
}
