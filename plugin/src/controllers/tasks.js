// The writes of tasks: a task's line rewritten where it is (found again by its words), with an undo
// notice; the task window (components/uikit/TaskWindow) and the Tasks plugin's edit dialog; a
// task's record in tasks.json; a new task on top of Master.md (to the pool: a record alone).
import { Notice } from "obsidian";
import { edit, editLine, undoLines } from "#/helpers/files.js";
import { tasksApi } from "#/helpers/plugins.js";
import { Task } from "#/models/task.js";
import { taskWindow } from "#/components/uikit/TaskWindow/index.js";
import { app } from "#/helpers/app.js";
import { taskStore } from "#/store/tasks.js";
import { MASTER, TASK_RECORDS } from "#/helpers/paths.js";

// Rewrite a Dataview task's line in its file (fn returns the new line, null deletes it),
// only if that line is still the same copy of the task.
export const editTaskLine = (t, fn) =>
  editLine(t.path, t.line, line => new Task(line).sameAs(Task.of(t)), fn);

// The task window's picks as record fields: time "#time/morning" → "morning".
const recOf = p => ({
  difficulty: p.difficulty ?? null, area: p.area ?? null, time: p.time?.slice(6) ?? null,
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

// the next free id: the biggest one of the records plus one
export const newId = records =>
  `t${Math.max(0, ...[...records.keys()].map(id => +id.slice(1))) + 1}`;

// Edit a task: the task window (difficulty, area, time, sticker: to its record), then the Tasks
// plugin's own edit dialog on its line with the name in place of the id (name: to the record,
// dates: to the line; works on the phone). Cancelling either changes nothing. A pool item has no
// line: the window alone, with its name. `ask` is the window (a test gives its own).
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

  await saveRecords({ [id]: patch });
  if (next !== line) await editTaskLine(t, () => next);
};

// A new task from the New task command: `name` (a past task's, or a typed one), the window's
// picks, the Tasks dialog's result line. A past task (`oldId`) whose name is unchanged (case and
// spaces aside) reuses its id and record, and so does a typed name some record
// already has; any other name is a new task: a new id and a record.
// To the pool (pick.pool): a record with pool: true, no line; else the line (id, dates)
// on top of Master.md (false when Master.md is missing).
export async function saveNewTask(name, pick, result, oldId = null) {
  const { records } = taskStore;
  const key = n => Task.keyOf(`- [ ] ${n}`);
  const same = id => key(records.get(id)?.name ?? "") === key(name);
  const old = same(oldId) ? oldId : [...records.keys()].find(same) ?? null;
  const id = old ?? newId(records);
  const back = Task.unnamed(result, id);

  await saveRecords({
    [id]: {
      ...old ? {} : { goal: null, tags: [], after: null },
      ...recOf(pick), name: back.name || name, ...pick.pool ? { pool: true } : {},
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
  const frag  = document.createDocumentFragment();
  frag.append(`${mark} ${new Task(before).text.slice(0, 40)}  `);
  const undo = frag.appendChild(document.createElement("button"));
  undo.textContent = "Undo";
  undo.onclick = undoLines(t.path, t.line, added, before, around);
  new Notice(frag, 8000);
};

export const deleteTaskLine = t => editTaskLineWithUndo(t, () => null, "🗑");

// a new task: the line on top of Master.md (false when Master.md is missing: nothing written); one
// place for the New task command and the calendar's pool drop
export async function addTask(line) {
  if (!app.vault.getFileByPath(MASTER)) return false;
  await edit(MASTER, c => line + "\n" + c);
  return true;
}
