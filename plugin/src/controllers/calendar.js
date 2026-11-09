// The writes of the calendar. Every edit goes through editTaskLine* (the line found again by its
// text); most come with an undo notice. A 🔁 task ticked goes through the Tasks plugin, so it gets
// its next copy.
import { Task } from "#/models/task.js";
import { T, canReorder } from "#/models/calendarData.js";
import {
  addTask, deleteTaskLine, editTaskLine, editTaskLineWithUndo, editTaskModal, saveRecords, tickTask,
} from "./tasks.js";


export function makeActions(ctx) {
  const { today } = ctx;
  const TASKS = ctx.TASKS;
  // ⏭ skip a dated 🔁 task this time: the rule moves on (Tasks makes the next copy), this one stays
  // as cancelled "- [-] … [cancelled:: date]", which counts as neither done nor missed
  const canSkip = t => !!TASKS && T(t).canSkip;
  // a missed copy skipped: the next one from today on (skipLines)
  const skip    = t => editTaskLineWithUndo(t, line => Task.skipLines(
    TASKS.executeToggleTaskDoneCommand(line, t.path), T(t).isOverdue(today) ? today : null), "⏭");
  const unplan  = t =>
    editTaskLineWithUndo(t, line => new Task(line).place(null, false), "↩ no date");
  // a pool item's copy (its id, created today) goes to the top of Master.md, like a new task:
  // open on `day` (no date for null), or done that day
  const fromPool = (t, day, done) =>
    addTask(Task.created(t.id, today).place(day, done));
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
  // a task dropped on another of `day` (canReorder): it goes before / after that one among the
  // day's open tasks of its group, and the group is numbered 0…n in the records
  const reorder = (t, to, after, day) => {
    const group = ctx.model.byDay[day].filter(e => e.kind === "open" && canReorder(t, e.t))
      .map(e => e.t);

    group.splice(group.indexOf(to) + (after ? 1 : 0), 0, t);
    return saveRecords(Object.fromEntries(group.map((x, i) => [T(x).id, { order: i }])));
  };

  return {
    canSkip, skip, tick: tickTask, unplan, fromPool, place, reorder, doneOnItsDay, toToday,
    pauseOrResume,
    remove: deleteTaskLine, edit: editTaskModal,
  };
}
