// The writes of the calendar. Every edit goes through editTaskLine* (the line found again by its
// text); most come with an undo notice. A 🔁 task ticked goes through the Tasks plugin, so it gets
// its next copy.
import { Task } from "#/models/task.js";
import { T } from "#/models/calendarData.js";
import { moveLine } from "#/helpers/files.js";
import {
  addTask, deleteTaskLine, editTaskLine, editTaskLineWithUndo, editTaskModal,
} from "./tasks.js";


export function makeActions(ctx) {
  const { today } = ctx;
  const TASKS = ctx.TASKS;
  // ⏭ skip a dated 🔁 task this time: the rule moves on (Tasks makes the next copy), this one stays
  // as cancelled "- [-] … ❌ date", which counts as neither done nor missed
  const canSkip = t => !!TASKS && T(t).canSkip;
  const skip    = t => editTaskLineWithUndo(t,
    line => Task.skipLines(TASKS.executeToggleTaskDoneCommand(line, t.path)), "⏭");
  const tick    = t =>
    editTaskLineWithUndo(t, line => TASKS.executeToggleTaskDoneCommand(line, t.path), "✓");
  const unplan  = t =>
    editTaskLineWithUndo(t, line => new Task(line).place(null, false), "↩ no date");
  // a pool item's copy goes to the top of Master.md, like a new task: open on `day` (no date for
  // null), or done that day
  const fromPool = (t, day, done) =>
    addTask(new Task(Task.fromPool(T(t).line, today)).place(day, done));
  // a task dropped on `day` (null: the backlog): open and due that day, or done that day. An open 🔁
  // task done on a day goes through the Tasks plugin (so it gets its next copy), then back to that
  // day
  const place = async (t, day, done) => {
    if (t.pool) return fromPool(t, day, done);
    const repeat = line => done && TASKS && new Task(line).isOpen && new Task(line).isRecurring;
    await editTaskLine(t, line => repeat(line)
      ? Task.backdateDone(TASKS.executeToggleTaskDoneCommand(line, t.path), day, today)
      : new Task(line).place(day, done));
  };

  // "Missed?": done on its own day, or moved to today
  const doneOnItsDay = t => editTaskLine(t,
    line => Task.backdateDone(TASKS.executeToggleTaskDoneCommand(line, ""), T(t).date, today));
  const toToday      = t => editTaskLine(t, line => new Task(line).setDue(today));
  // ⏸ pause: drop its dates; ▶ resume: from today, on the first day its rule allows
  const pauseOrResume = t =>
    editTaskLineWithUndo(t, line => new Task(line).togglePause(today), T(t).isPaused ? "▶" : "⏸");
  // a task dropped on another of its day (canReorder): its line before / after that one's
  const same    = t => line => new Task(line).sameAs(Task.of(t));
  const reorder = (t, to, after) => moveLine(t.path, t.line, same(t), to.line, same(to), after);
  const remove = t => deleteTaskLine(t);
  const edit   = t => editTaskModal(t);

  return {
    canSkip, skip, tick, unplan, fromPool, place, reorder, doneOnItsDay, toToday, pauseOrResume,
    remove, edit,
  };
}
