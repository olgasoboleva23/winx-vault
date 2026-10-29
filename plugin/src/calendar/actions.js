// What the calendar writes. Every edit goes through H.editTaskLine* (the line found again by its text);
// most come with an undo notice. A 🔁 task ticked goes through the Tasks plugin, so it gets its next copy.
import { H } from "../lib/helpers.js";
import { Task } from "../lib/task.js";
import { T } from "./data.js";

const MASTER = "02 Areas/Personal/Tasks/Master.md";

export function makeActions(ctx) {
  const { today } = ctx;
  const TASKS = ctx.TASKS;
  // ⏭ skip a dated 🔁 task this time: the rule moves on (Tasks makes the next copy), this one stays as cancelled
  // "- [-] … ❌ date", which counts as neither done nor missed
  const canSkip = t => !!TASKS && T(t).isOpen && T(t).isRecurring && !!T(t).date;
  const skip    = t => H.editTaskLineWithUndo(t, line => Task.skipLines(TASKS.executeToggleTaskDoneCommand(line, t.path)), Task, "⏭");
  const tick    = t => H.editTaskLineWithUndo(t, line => TASKS.executeToggleTaskDoneCommand(line, t.path), Task, "✓");
  const unplan  = t => H.editTaskLineWithUndo(t, line => new Task(line).place(null, false), Task, "↩ no date");
  // a pool item's copy goes to the top of Master.md, like a new task: open on `day` (no date for null), or done that day
  const fromPool = (t, day, done) => app.vault.process(app.vault.getAbstractFileByPath(MASTER),
    c => new Task(Task.fromPool(T(t).line, today)).place(day, done) + "\n" + c);
  // a task dropped on `day` (null: the backlog): open and due that day, or done that day. An open 🔁 task done on
  // a day goes through the Tasks plugin (so it gets its next copy), then back to that day
  const place = async (t, day, done) => {
    if (t.pool) return fromPool(t, day, done);
    const repeat = line => done && TASKS && new Task(line).isOpen && new Task(line).isRecurring;
    await H.editTaskLine(t, line => repeat(line)
      ? Task.backdateDone(TASKS.executeToggleTaskDoneCommand(line, t.path), day, today)
      : new Task(line).place(day, done), Task);
  };
  // "Missed?": done on its own day, or moved to today
  const doneOnItsDay = t => H.editTaskLine(t, line => Task.backdateDone(TASKS.executeToggleTaskDoneCommand(line, ""), T(t).date, today), Task);
  const toToday      = t => H.editTaskLine(t, line => new Task(line).setDue(today), Task);
  // ⏸ pause: drop its dates; ▶ resume: from today, on the first day its rule allows
  const pauseOrResume = t => {
    const paused = !T(t).date;
    return H.editTaskLineWithUndo(t, line => paused ? new Task(line).resume(today) : new Task(line).pause(), Task, paused ? "▶" : "⏸");
  };
  const setDifficulty = (t, tag) => H.editTaskLineWithUndo(t, line => new Task(line).setDifficulty(tag), Task, "⭐");
  const remove = t => H.deleteTaskLine(t, Task);
  const edit   = t => H.editTaskModal(t, Task);
  return { canSkip, skip, tick, unplan, fromPool, place, doneOnItsDay, toToday, pauseOrResume, setDifficulty, remove, edit };
}
