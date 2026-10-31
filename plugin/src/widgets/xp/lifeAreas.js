// Life Areas: a radar of XP per area over the last 4 weeks up to the page's day, plus the habit bonus this month.
import { html } from "../../ui/html.js";
import { Widget } from "../widget.js";
import config from "../../core/config.js";
import { pageDay } from "../../core/dates.js";
import { collectHabitDays, taskXp } from "./xp.js";
import { chartColor } from "../../ui/chart.js";

export class LifeAreas extends Widget {
  async data() {
    const { xpMap, areaMap, areas, HABIT_BONUS_XP, HABIT_BONUS_THRESHOLD } = config;
    const sel = pageDay(this.dv), since = sel.minus({ days: 27 }).startOf("day");
    const scores = Object.fromEntries(areas.map(a => [a.name, 0]));
    // task XP per area, last 4 weeks up to the selected date
    for (const t of this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks.where(t => t.completed && t.completion && t.completion.ts >= since.ts && t.completion.ts <= sel.endOf("day").ts)) {
      const area = Object.entries(areaMap).find(([tag]) => t.tags.includes(tag))?.[1];
      if (area) scores[area] += taskXp(t, xpMap);
    }
    // habit bonus per area — shared scan from xp.js
    for (const { area, days } of Object.values(collectHabitDays(this.dv, sel.startOf("month"), sel.endOf("month"))))
      if (days.size >= HABIT_BONUS_THRESHOLD && areaMap[area]) scores[areaMap[area]] += HABIT_BONUS_XP;
    return { scores };
  }
  view() { return html`<div class="winx-goal-min" style="text-align: center;">last 4 weeks</div>`; }
  async after(root, { scores }) {
    const caption = root.querySelector(".winx-goal-min");
    this.keep(await window.renderChart({
      type: "radar",
      data: { labels: Object.keys(scores), datasets: [{ label: "Areas", data: Object.values(scores), backgroundColor: chartColor("--winx-pink-deep", 0.3), borderColor: chartColor("--winx-pink-deep"), borderWidth: 2 }] },
      options: { plugins: { legend: { display: false } } },
    }, root));
    root.append(caption);   // under the chart
  }
}
