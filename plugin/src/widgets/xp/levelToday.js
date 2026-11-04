// Level and XP: total XP of the tasks done up to the page's day, the level it makes, progress to the next one;
// under it HP (the missed tasks against today's done ones) and MP (the day of the cycle), rules in vitals.js.
// The markup: LevelToday.vue.
import config from "../../core/config.js";
import { pageDay, todayYmd, ymd } from "../../core/dates.js";
import { Task } from "../../tasks/task.js";
import { levelInfo, taskXp } from "./xp.js";
import { vitals, mana, mpLine, mpTable } from "./vitals.js";
import { cycleLog } from "../body/cycle.js";
import { TASKS } from "../../core/paths.js";

export async function loadLevelToday({ dv }) {
  const { xpMap } = config;
  const day = ymd(pageDay(dv)), today = todayYmd();
  const tasks = dv.pages(`"${TASKS}"`).file.tasks.array();
  const total = tasks.filter(t => t.completed && ymd(t.completion) <= day)
    .reduce((sum, t) => sum + taskXp(t, xpMap), 0);
  const all = tasks.map(t => Task.of(t));
  const v = vitals({ missed: all.filter(t => t.isOverdue(today)), doneToday: all.filter(t => t.doneOn === today) });
  const { level, progress, cost } = levelInfo(total), mp = mana(cycleLog(dv)?.on(today));
  const vital = (name, value, max, title) =>
    ({ name, mod: name.toLowerCase(), value, max, width: value / max * 100, title });
  return {
    total, level, progress, cost, fill: (progress / cost * 100).toFixed(1),
    vitals: [
      vital("HP", v.hp, v.hpMax, `missed tasks −${v.damage}, done today +${v.heal}`),
      mp && vital("MP", mp.value, mp.max,
        `${mpLine(mp)} (day ${mp.day} of the cycle)\n\n${mpTable(mp)}`),
    ].filter(Boolean),
  };
}
