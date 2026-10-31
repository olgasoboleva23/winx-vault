// Level and XP: total XP of the tasks done up to the page's day, the level it makes, progress to the next one;
// under it HP (the missed tasks against today's done ones) and MP (today's focus), rules in vitals.js.
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import config from "../../core/config.js";
import { pageDay, todayYmd, ymd } from "../../core/dates.js";
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
    const stats = await this.app.vault.adapter.read(POMODORO).then(JSON.parse).then(p => p.stats).catch(() => null);
    const v = vitals({ missed: all.filter(t => t.isOverdue(today)), doneToday: all.filter(t => t.doneOn === today), focus: stats?.date === today ? stats.sessions : 0 });
    return { total, ...levelInfo(total), v };
  }
  view({ total, level, progress, cost, v }) {
    const bar = (name, value, max, title) => html`<div class="winx-vital ${name.toLowerCase()}" title="${title}"><b>${name}</b><div class="winx-vital-bar"><i style="width: ${value / max * 100}%"></i></div><span>${value}/${max}</span></div>`;
    return html`<div class="winx-stat-card">
      <div class="winx-icon-circle"></div>
      <div class="winx-stat-body">
        <div class="winx-stat-text">Level: ${level} | Total XP: ${total}</div>
        <div class="winx-stat-text">Progress: ${progress}/${cost}</div>
        <div class="winx-progress-bar">
          <div class="winx-progress-fill" style="width:${(progress / cost * 100).toFixed(1)}%"></div>
        </div>
        <div class="winx-vitals">
          ${bar("HP", v.hp, v.hpMax, `missed tasks −${v.damage}, done today +${v.heal}`)}
          ${bar("MP", v.mp, v.mpMax, `focus sessions today: ${v.mp} of ${v.mpMax}`)}
        </div>
      </div>
    </div>`;
  }
}
