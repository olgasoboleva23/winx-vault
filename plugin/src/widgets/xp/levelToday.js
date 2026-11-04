// Level and XP: total XP of the tasks done up to the page's day, the level it makes, progress to the next one;
// under it HP (the missed tasks against today's done ones) and MP (the day of the cycle), rules in vitals.js.
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import config from "../../core/config.js";
import { pageDay, todayYmd, ymd } from "../../core/dates.js";
import { Task } from "../../tasks/task.js";
import { levelInfo, taskXp } from "./xp.js";
import { vitals, mana, mpLine, mpTable } from "./vitals.js";
import { cycleLog } from "../body/cycle.js";
import { TASKS } from "../../core/paths.js";

export class LevelToday extends Widget {
  async data() {
    const { xpMap } = config;
    const day = ymd(pageDay(this.dv)), today = todayYmd();
    const tasks = this.dv.pages(`"${TASKS}"`).file.tasks.array();
    const total = tasks.filter(t => t.completed && ymd(t.completion) <= day)
      .reduce((sum, t) => sum + taskXp(t, xpMap), 0);
    const all = tasks.map(t => Task.of(t));
    const v = vitals({ missed: all.filter(t => t.isOverdue(today)), doneToday: all.filter(t => t.doneOn === today) });
    const { level, progress, cost } = levelInfo(total), mp = mana(cycleLog(this.dv)?.on(today));
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
  // HP or MP: its bar and value/max, the reasons in its tooltip
  vital({ name, mod, value, max, width, title }) {
    return html`
      <div class="winx-level__vital winx-level__vital--${mod}" title="${title}">
        <b class="winx-level__vital-name">${name}</b>
        <div class="winx-level__vital-bar">
          <i class="winx-level__vital-fill" style="width: ${width}%"></i>
        </div>
        <span class="winx-level__vital-value">${value}/${max}</span>
      </div>`;
  }
  view({ total, level, progress, cost, fill, vitals }) {
    return html`<div class="winx-level">
      <div class="winx-level__icon"></div>
      <div class="winx-level__body">
        <div class="winx-level__text">Level: ${level} | Total XP: ${total}</div>
        <div class="winx-level__text">Progress: ${progress}/${cost}</div>
        <div class="winx-level__progress">
          <div class="winx-level__progress-fill" style="width:${fill}%"></div>
        </div>
        <div class="winx-level__vitals">
          ${vitals.map(x => this.vital(x))}
        </div>
      </div>
    </div>`;
  }
}
