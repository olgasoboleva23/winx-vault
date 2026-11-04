// Life Areas: a radar of XP per area over the last 4 weeks up to the page's day, plus the habit
// bonus this month. The markup: LifeAreas.vue.
import config from "../../core/config.js";
import { pageDay } from "../../core/dates.js";
import { collectHabitDays, taskXp } from "./xp.js";
import { chartColor } from "../../core/chart.js";
import { TASKS, dailyFolder } from "../../core/paths.js";

// { scores: XP by area name, chart: the radar's config for WinxChart }
export async function loadLifeAreas({ dv, app }) {
  const { xpMap, areaMap, areas, HABIT_BONUS_XP, HABIT_BONUS_THRESHOLD } = config;
  const sel = pageDay(dv), since = sel.minus({ days: 27 }).startOf("day");
  const scores = Object.fromEntries(areas.map(a => [a.name, 0]));
  // task XP per area, last 4 weeks up to the selected date
  const done = dv.pages(`"${TASKS}"`).file.tasks
    .where(t => t.completed && t.completion
      && t.completion.ts >= since.ts && t.completion.ts <= sel.endOf("day").ts);

  for (const t of done) {
    const area = Object.entries(areaMap).find(([tag]) => t.tags.includes(tag))?.[1];

    if (area) scores[area] += taskXp(t, xpMap);
  }

  // habit bonus per area — shared scan from xp.js
  const habits = collectHabitDays(dv, dailyFolder(app), sel.startOf("month"), sel.endOf("month"));

  for (const { area, days } of Object.values(habits)) {
    const name = areaMap[area];

    if (days.size >= HABIT_BONUS_THRESHOLD && name) scores[name] += HABIT_BONUS_XP;
  }

  return {
    scores,
    chart: {
      type: "radar",
      data: { labels: Object.keys(scores), datasets: [{
        label: "Areas", data: Object.values(scores), borderWidth: 2,
        backgroundColor: chartColor("--winx-pink-deep", 0.3),
        borderColor: chartColor("--winx-pink-deep"),
      }] },
      options: { plugins: { legend: { display: false } } },
    },
  };
}
