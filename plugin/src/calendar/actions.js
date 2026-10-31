// What the calendar writes. Every edit goes through editTaskLine* (the line found again by its text);
// most come with an undo notice. A 🔁 task ticked goes through the Tasks plugin, so it gets its next copy.
import { Task } from "../tasks/task.js";
import { T } from "./data.js";
import { edit as editFile } from "../core/files.js";
import { deleteTaskLine, editTaskLine, editTaskLineWithUndo, editTaskModal } from "../tasks/taskEdit.js";

const MASTER = "02 Areas/Personal/Tasks/Master.md";

export function makeActions(ctx) {
  const { today } = ctx;
  const TASKS = ctx.TASKS;
  // ⏭ skip a dated 🔁 task this time: the rule moves on (Tasks makes the next copy), this one stays as cancelled
  // "- [-] … ❌ date", which counts as neither done nor missed
  const canSkip = t => !!TASKS && T(t).isOpen && T(t).isRecurring && !!T(t).date;
  const skip    = t => editTaskLineWithUndo(t, line => Task.skipLines(TASKS.executeToggleTaskDoneCommand(line, t.path)), "⏭");
  const tick    = t => editTaskLineWithUndo(t, line => TASKS.executeToggleTaskDoneCommand(line, t.path), "✓");
  const unplan  = t => editTaskLineWithUndo(t, line => new Task(line).place(null, false), "↩ no date");
  // a pool item's copy goes to the top of Master.md, like a new task: open on `day` (no date for null), or done that day
  const fromPool = (t, day, done) => editFile(MASTER, c => new Task(Task.fromPool(T(t).line, today)).place(day, done) + "\n" + c);
  // a task dropped on `day` (null: the backlog): open and due that day, or done that day. An open 🔁 task done on
  // a day goes through the Tasks plugin (so it gets its next copy), then back to that day
  const place = async (t, day, done) => {
    if (t.pool) return fromPool(t, day, done);
    const repeat = line => done && TASKS && new Task(line).isOpen && new Task(line).isRecurring;
    await editTaskLine(t, line => repeat(line)
      ? Task.backdateDone(TASKS.executeToggleTaskDoneCommand(line, t.path), day, today)
      : new Task(line).place(day, done));
  };
  // "Missed?": done on its own day, or moved to today
  const doneOnItsDay = t => editTaskLine(t, line => Task.backdateDone(TASKS.executeToggleTaskDoneCommand(line, ""), T(t).date, today));
  const toToday      = t => editTaskLine(t, line => new Task(line).setDue(today));
  // ⏸ pause: drop its dates; ▶ resume: from today, on the first day its rule allows
  const pauseOrResume = t => {
    const paused = !T(t).date;
    return editTaskLineWithUndo(t, line => paused ? new Task(line).resume(today) : new Task(line).pause(), paused ? "▶" : "⏸");
  };
  const setDifficulty = (t, tag) => editTaskLineWithUndo(t, line => new Task(line).setDifficulty(tag), "⭐");
  const remove = t => deleteTaskLine(t);
  const edit   = t => editTaskModal(t);
  return { canSkip, skip, tick, unplan, fromPool, place, doneOnItsDay, toToday, pauseOrResume, setDifficulty, remove, edit };
}
