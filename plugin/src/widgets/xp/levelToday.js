// Level and XP: total XP of the tasks done up to the page's day, the level it makes, progress to the next one.
import { html } from "../../ui/html.js";
import { Widget } from "../widget.js";
import config from "../../core/config.js";
import { pageDay, ymd } from "../../core/dates.js";
import { levelInfo, taskXp } from "./xp.js";

export class LevelToday extends Widget {
  async data() {
    const { xpMap } = config;
    const day = ymd(pageDay(this.dv));
    const total = this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks
      .where(t => t.completed && ymd(t.completion) <= day).array()
      .reduce((sum, t) => sum + taskXp(t, xpMap), 0);
    return { total, ...levelInfo(total) };
  }
  view({ total, level, progress, cost }) {
    return html`<div class="winx-stat-card">
      <div class="winx-icon-circle"></div>
      <div class="winx-stat-body">
        <div class="winx-stat-text">Level: ${level} | Total XP: ${total}</div>
        <div class="winx-stat-text">Progress: ${progress}/${cost}</div>
        <div class="winx-progress-bar">
          <div class="winx-progress-fill" style="width:${(progress / cost * 100).toFixed(1)}%"></div>
        </div>
      </div>
    </div>`;
  }
}
