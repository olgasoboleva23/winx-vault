// The goals' controller: per goal "X of Y this week", Mon–Sun dots, the minimum version, and how
// often it was done. A missed goal task stays on its day (the calendar's Missed? lists it). The
// markup: widgets/goals.
import { dm, pageDay, todayYmd, weekOf, ymd } from "#/helpers/dates.js";
import { Goal } from "#/models/goal.js";
import { GOALS } from "#/helpers/paths.js";
import { T } from "#/models/calendarData.js";
import { taskStore } from "#/store/tasks.js";

export async function loadGoals({ dv, app }) {
  const path = `${GOALS}.md`;

  if (!app.vault.getAbstractFileByPath(path)) return { missing: true, path };
  const selected = ymd(pageDay(dv)), today = todayYmd(), week = weekOf(selected);
  const goals = dv.pages(`"${GOALS}"`).file.lists
    .map(i => Goal.parse(i.text)).where(Boolean).array();
  const tasks = taskStore.tasks.map(T);

  return {
    goals: goals.map(goal => {
      const done = tasks.filter(t => t.isDone && t.doneOn && t.goal === goal.key)
        .map(t => t.doneOn);
      const doneSet = new Set(done), last = [...done].sort().at(-1);
      // "I've done this before": total and last time, from the ✅ dates already in the tasks
      const bits = [goal.min && `min: ${goal.min}`,
        done.length && `done ${done.length}× · last ${dm(last)}`];

      return {
        name: goal.name, plan: goal.plan,
        count: `${goal.doneIn(done, week)} of ${goal.weeklyTarget}`,
        dots: week.map(day => ({
          day, status: goal.statusOn(day, doneSet, today), sel: day === selected,
        })),
        min: bits.filter(Boolean).join("  ·  "),
      };
    }),
  };
}
