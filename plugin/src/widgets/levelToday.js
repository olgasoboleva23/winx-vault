// Level and XP: total XP of the tasks done up to the page's day, the level it makes, progress to the next one.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

export class LevelToday extends Widget {
  async data() {
    const { xpMap } = await H.loadConfig();
    const day = H.ymd(H.pageDay(this.dv));
    const total = this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks
      .where(t => t.completed && H.ymd(t.completion) <= day).array()
      .reduce((sum, t) => sum + H.taskXp(t, xpMap), 0);
    return { total, ...L.levelInfo(total) };
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
