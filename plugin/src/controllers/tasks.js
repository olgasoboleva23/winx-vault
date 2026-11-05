// The writes of tasks: a task's line rewritten where it is (found again by its words), with an undo
// notice; the task window (components/uikit/TaskWindow) and the Tasks plugin's edit dialog; a
// new task on top of Master.md, a new pool line at the end of Pool.md.
import { Notice } from "obsidian";
import { appendLine, edit, editLine, undoLines } from "#/helpers/files.js";
import { tasksApi } from "#/helpers/plugins.js";
import { Task } from "#/models/task.js";
import { taskWindow } from "#/components/uikit/TaskWindow/index.js";
import { app } from "#/helpers/app.js";
import { MASTER, POOL } from "#/helpers/paths.js";

// Rewrite a Dataview task's line in its file (fn returns the new line, null deletes it),
// only if that line is still the same copy of the task.
export const editTaskLine = (t, fn) =>
  editLine(t.path, t.line, line => new Task(line).sameAs(Task.of(t)), fn);

// Edit a task: the task window, then the Tasks plugin's own edit dialog (text, dates; works on the
// phone). Cancelling either changes nothing. A pool line (t.pool) goes through the dialog as a task
// and comes back as a pool line (any dates set there are dropped).
export const editTaskModal = async t => {
  const api  = tasksApi();
  const text = await app.vault.cachedRead(app.vault.getAbstractFileByPath(t.path));
  const line = text.split("\n")[t.line];

  if (!api || Task.keyOf(line ?? "") !== Task.keyOf(t.text)) return;
  const was  = new Task(line).picks;
  const pick = await taskWindow(was);

  if (!pick) return;
  // the picks go in first, so the Tasks dialog shows them; nothing is written until it saves
  const changed = Object.fromEntries(Object.entries(pick).filter(([k, v]) => v !== was[k]));
  const asTask = t.pool ? line.replace(/^(\s*)- /, "$1- [ ] ") : line;
  // "" when cancelled
  const edited = await api.editTaskLineModal(new Task(asTask).withPicks(changed));
  const next = edited && (t.pool ? new Task(edited).poolLine : edited);

  if (next && next !== line) await editTaskLine(t, () => next);
};

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

// a pool line (no checkbox, no dates) at the end of Pool.md, made on first use
export const addPoolLine = line =>
  appendLine(POOL, line, {
    header: "Tasks to pick when it's time: drag one from the calendar's Pool tab onto a day.\n\n",
  });
