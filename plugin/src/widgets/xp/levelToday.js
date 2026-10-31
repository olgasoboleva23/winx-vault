// Level and XP: total XP of the tasks done up to the page's day, the level it makes, progress to the next one;
// under it HP (the missed tasks against today's done ones) and MP (today's focus), rules in vitals.js.
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import config from "../../core/config.js";
import { pageDay, todayYmd, ymd } from "../../core/dates.js";
import { readJson } from "../../core/files.js";
import { Task } from "../../tasks/task.js";
import { levelInfo, taskXp } from "./xp.js";
import { vitals } from "./vitals.js";

const POMODORO = "00 System/Data/pomodoro.json";

export class LevelToday extends Widget {
  async data() {
    const { xpMap } = config;
    const day = ymd(pageDay(this.dv)), today = todayYmd();
    const tasks = this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks.array();
    const total = tasks.filter(t => t.completed && ymd(t.completion) <= day).reduce((sum, t) => sum + taskXp(t, xpMap), 0);
    const all = tasks.map(t => Task.of(t));
    const stats = (await readJson(POMODORO))?.stats;
    const v = vitals({ missed: all.filter(t => t.isOverdue(today)), doneToday: all.filter(t => t.doneOn === today), focus: stats?.date === today ? stats.sessions : 0 });
    return { total, ...levelInfo(total), v };
  }
  view({ total, level, progress, cost, v }) {
    const bar = (name, value, max, title) => html`<div class="winx-level__vital winx-level__vital--${name.toLowerCase()}" title="${title}"><b class="winx-level__vital-name">${name}</b><div class="winx-level__vital-bar"><i class="winx-level__vital-fill" style="width: ${value / max * 100}%"></i></div><span class="winx-level__vital-value">${value}/${max}</span></div>`;
    return html`<div class="winx-level">
      <div class="winx-level__icon"></div>
      <div class="winx-level__body">
        <div class="winx-level__text">Level: ${level} | Total XP: ${total}</div>
        <div class="winx-level__text">Progress: ${progress}/${cost}</div>
        <div class="winx-level__progress">
          <div class="winx-level__progress-fill" style="width:${(progress / cost * 100).toFixed(1)}%"></div>
        </div>
        <div class="winx-level__vitals">
          ${bar("HP", v.hp, v.hpMax, `missed tasks −${v.damage}, done today +${v.heal}`)}
          ${bar("MP", v.mp, v.mpMax, `focus sessions today: ${v.mp} of ${v.mpMax}`)}
        </div>
      </div>
    </div>`;
  }
}
