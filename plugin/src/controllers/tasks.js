// The writes of tasks: a task's line rewritten where it is (found again by its words), with an undo
// notice; the task window (components/uikit/TaskWindow) and the Tasks plugin's edit dialog; a
// task's record in tasks.json; a new task on top of Master.md (to the pool: a record alone).
import { Notice } from "obsidian";
import { edit, editLine, serial, undoLines } from "#/helpers/files.js";
import { tasksApi } from "#/helpers/plugins.js";
import { Task, VariantProblem, nextVariantAfter, variantsProblem } from "#/models/task.js";
import { taskWindow } from "#/components/uikit/TaskWindow/index.js";
import { app } from "#/helpers/app.js";
import { parseNote } from "#/models/taskFile.js";
import { MASTER, TASK_RECORDS } from "#/helpers/paths.js";
import { pickTask } from "#/components/uikit/TaskSearch/index.js";
import { todayYmd } from "#/helpers/dates.js";
import { nextId } from "#/helpers/ids.js";
import { records as recordsStore } from "#/store/tasks.js";

// One write at a time, including its queue change and undo; dialogs do not hold the queue.
const writeTask = serial();

export const editTaskLine = (t, fn) => writeTask(() => changeTaskLine(t, fn));

// Keep Tasks' output intact. If the JSON save fails, restore only our unchanged log edit.
// A modal supplies the original line and record so a concurrent edit wins over the old form.
async function changeTaskLine(t, fn, patch = {}, expected = null) {
  const id = Task.of(t).id;
  const all = await recordsFromDisk();

  if (!all) return null;
  const record = all[id];
  const stale = expected ? JSON.stringify(record) !== JSON.stringify(expected.record)
    : new Task("", null, record).currVariant !== Task.of(t).currVariant;

  if (stale) {
    new Notice("✦ task record changed, try again");
    return null;
  }

  const updated = { ...record, ...patch };
  let before, after, around;

  try {
    if (!await editLine(t.path, t.line,
      line => expected ? line === expected.line : new Task(line).sameAs(Task.of(t)),
      (line, lines) => {
        before = line;
        after = fn(line, lines);
        around = { above: lines[t.line - 1], below: lines[t.line + 1] };
        const next = nextVariantAfter(line, after, updated, lines.filter((_, i) => i !== t.line));

        if (next !== null) patch = { ...patch, currVariant: next };
        Object.assign(updated, patch);
        return after;
      })) return null;
  } catch (error) {
    if (!(error instanceof VariantProblem)) throw error;
    new Notice(`✦ ${error.message}`);
    return null;
  }

  const added = after === null ? [] : after.split("\n");
  const revert = () => undoLines(t.path, t.line, added, before, around)();

  try {
    if (Object.keys(patch).length && !await saveRecords({ [id]: patch }, { [id]: record })) {
      await revert();
      return null;
    }
  } catch (error) {
    await revert();
    throw error;
  }

  let undone = false;

  return () => writeTask(async () => {
    if (undone) return false;
    const queueChanged = "currVariant" in patch;

    if (queueChanged) {
      const all = await recordsFromDisk();

      if (!all) return false;
      if (JSON.stringify(all[id]) !== JSON.stringify(updated)) {
        new Notice("✦ task changed since completion — undo not applied");
        return false;
      }
    }

    if (!await revert()) return false;
    try {
      if (queueChanged && !await saveRecords({ [id]: { currVariant: record?.currVariant } },
        { [id]: updated })) {
        await undoLines(t.path, t.line, [before], after, around)();
        return false;
      }
    } catch (error) {
      await undoLines(t.path, t.line, [before], after, around)();
      throw error;
    }

    undone = true;
    return true;
  });
}

// The task window's picks as record fields.
const recOf = p => ({
  difficulty: p.difficulty ?? null, area: p.area ?? null, daytime: p.daytime ?? null,
  sticker: p.sticker ?? null,
  ..."variants" in p ? { variants: p.variants, currVariant: p.currVariant } : {},
});

// Merge a patch into tasks.json ({ id: fields } merges into the record), one write; an optional
// snapshot rejects stale modal edits. The file is made when missing.
// Between devices, Remotely Save still uses last writer wins.
export const saveRecords = (patch, expected = null) => recordsStore.edit(all => {
  if (expected && Object.entries(expected).some(([id, rec]) =>
    JSON.stringify(all[id]) !== JSON.stringify(rec))) {
    new Notice("✦ task record changed, try again");
    return null;
  }

  for (const [id, p] of Object.entries(patch)) all[id] = { ...all[id], ...p };
  return all;
});

// the next free id: the biggest t<N> of the records and of the lines (a line whose record was lost
// to a sync conflict keeps its id) plus one; other keys are skipped
export const newId = (records, tasks = []) =>
  nextId("t", [...records.keys(), ...tasks.map(t => Task.of(t).id).filter(Boolean)]);

// Edit a task: the task window (difficulty, area, daytime, sticker: to its record), then the Tasks
// plugin's own edit dialog on its line with the name in place of the id (name: to the record,
// dates: to the line; works on the phone). Cancelling either changes nothing. A pool item has no
// line: the window alone, with its name. `ask` is the window (a test gives its own). A line changed
// meanwhile (another device): nothing saved.
export const editTaskModal = async (t, ask = taskWindow) => {
  const id = Task.of(t).id, api = tasksApi();
  const all = await recordsFromDisk();

  if (!all) return;
  const record = all[id];
  const task = new Task(Task.of(t).line, t, record ?? t.rec);
  let line = null;

  if (!t.pool) {
    const text = await app.vault.cachedRead(app.vault.getAbstractFileByPath(t.path));

    line = text.split("\n")[t.line];
    if (!api || !id || !new Task(line ?? "").sameAs(task)) return;
  }

  const pick = await ask(t.pool ? { ...task.picks, name: task.name } : task.picks,
    false, { variants: t.pool || task.isOpen });

  if (!pick) return;
  const patch = { ...recOf(pick) };
  let next = line;

  if (t.pool) {
    if (pick.name) patch.name = pick.name;
  } else {
    const edited = await api.editTaskLineModal(new Task(line).named(task.name));

    // "" when cancelled
    if (!edited) return;
    const back = Task.unnamed(edited, id);

    patch.name = back.name || task.name;
    next = back.line;
  }

  if (t.pool) return writeTask(() => saveRecords({ [id]: patch }, { [id]: record }));
  return writeTask(() => changeTaskLine(t, () => next, patch, { line, record }));
};

// A new task from the New task command: `name` (a past task's, or a typed one), the window's
// picks, the Tasks dialog's result line. The name is the dialog's (its words may have been changed
// there). A past task (`oldId`) whose name is unchanged (case and spaces aside) reuses its id and
// record, and so does a name some record already has; any other name is a new task: a new id and
// a record. To the pool (pick.pool): a record with pool: true, no line; else the line (id, dates)
// on top of Master.md (false when Master.md is missing). One save at a time, the ids worked out
// from tasks.json and Master.md as they are on disk now (the store sees a write a moment later), so
// two saves at once never get one id.
export const saveNewTask = (...args) => writeTask(() => saveNew(...args));

// The New task command: a past task or a typed name, the window's picks, the Tasks dialog; the
// saved id, or null when cancelled or not saved (saveNew says why itself).
export async function newTask() {
  const found = await pickTask();

  if (!found) return null;
  const ready = !found.isNew && found.picks.difficulty && found.picks.area;
  const pick = ready ? found.picks : await taskWindow(found.picks ?? {}, true);

  if (!pick) return null;
  const api = tasksApi();

  if (!api) {
    new Notice("✦ Tasks plugin is off — task not saved");
    return null;
  }

  // created shows how long it waits on the board
  const result = await api.editTaskLineModal(Task.created(found.name, todayYmd()).line);

  if (!result) return null;
  return await saveNewTask(found.name, pick, result, found.id) || null;
}

// a note's text from disk ("" when it's missing)
const fromDisk = async path => {
  const file = app.vault.getFileByPath(path);

  return file ? app.vault.read(file) : "";
};

// tasks.json parsed ({} when missing); null and a notice when it isn't valid JSON
async function recordsFromDisk() {
  try {
    return JSON.parse(await fromDisk(TASK_RECORDS) || "{}");
  } catch {
    new Notice("✦ tasks.json isn't valid JSON — task not saved");
    return null;
  }
}

async function saveNew(name, pick, result, oldId = null) {
  const parsed = await recordsFromDisk();

  if (!parsed) return;
  const records = new Map(Object.entries(parsed));
  const tasks = parseNote(MASTER, await fromDisk(MASTER)).filter(i => i.status !== null);
  const final = Task.unnamed(result, "t0").name || name;
  const same = id => Task.nameKey(records.get(id)?.name ?? "") === Task.nameKey(final);
  const old = same(oldId) ? oldId : [...records.keys()].find(same) ?? null;
  const id = old ?? newId(records, tasks);
  const back = Task.unnamed(result, id);

  const patch = {
    ...old ? {} : { goal: null, after: null },
    ...recOf(pick), name: final, ...pick.pool ? { pool: true } : {},
  };
  const record = { ...records.get(id), ...patch };
  const problem = variantsProblem(record.variants ?? [], record.currVariant);

  if (problem) return void new Notice(problem);
  if (pick.pool) return await saveRecords({ [id]: patch }, { [id]: records.get(id) }) && id;
  let variant;

  try {
    variant = nextVariantAfter(Task.created(id, "").line, back.line,
      record, tasks.map(t => Task.of(t).line));
  } catch (error) {
    if (!(error instanceof VariantProblem)) throw error;
    return void new Notice(`✦ ${error.message}`);
  }

  if (variant !== null) patch.currVariant = variant;
  if (!await addTask(back.line)) return false;
  const prefix = `${back.line}\n`;
  const rollback = () => edit(MASTER, text =>
    text.startsWith(prefix) ? text.slice(prefix.length) : text);

  try {
    if (await saveRecords({ [id]: patch }, { [id]: records.get(id) })) return id;
    await rollback();
    return false;
  } catch (error) {
    await rollback();
    throw error;
  }
}

// Change a task's line like editTaskLine (fn may return several lines, or null to delete), then
// show a notice "<mark> <task>  undo" for 8 s; undo puts the old line back if the new lines are
// still there (once).
export const editTaskLineWithUndo = async (t, fn, mark) => {
  const undo = await editTaskLine(t, fn);

  if (undo) undoNotice(t, mark, undo);
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

// a new task: the line on top of Master.md (false and a notice when Master.md is missing: nothing
// written); one place for the New task command and the calendar's pool drop
export async function addTask(line) {
  if (!app.vault.getFileByPath(MASTER)) {
    new Notice(`✦ ${MASTER} not found — task not saved`);
    return false;
  }

  await edit(MASTER, c => line + "\n" + c);
  return true;
}

// Tick (or untick) a task through the Tasks plugin, so a 🔁 one gets its next copy
export const tickTask = t =>
  editTaskLineWithUndo(t, line => tasksApi().executeToggleTaskDoneCommand(line, t.path), "✓");
