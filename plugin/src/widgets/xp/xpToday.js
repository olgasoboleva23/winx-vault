// XP Today: the page's day's XP (with the habit bonus), its aura level, ↑/↓ against the 7-day
// average, and the month as a heatmap of daily levels. The markup: XpToday.vue.
import config from "../../core/config.js";
import { pageDay, ymd } from "../../core/dates.js";
import { collectHabitDays, taskXp } from "./xp.js";
import { TASKS, dailyFolder } from "../../core/paths.js";

export async function loadXpToday({ dv, app }) {
  const { xpMap, levels, HABIT_BONUS_XP, HABIT_BONUS_THRESHOLD } = config;
  const sel = pageDay(dv), start = sel.startOf("month"), end = sel.endOf("month");
  const levelOf = xp => levels.find(l => xp <= l.max) ?? levels.at(-1);
  // task XP by completion day
  const xpByDay = new Map();

  for (const t of dv.pages(`"${TASKS}"`).file.tasks.where(t => t.completed && t.completion)) {
    const day = ymd(t.completion);
    xpByDay.set(day, (xpByDay.get(day) ?? 0) + taskXp(t, xpMap));
  }

  const habits = Object.values(collectHabitDays(dv, dailyFolder(app), start, end));
  const bonusHabits = habits.filter(h => h.days.size >= HABIT_BONUS_THRESHOLD);
  const habitBonus = bonusHabits.length * HABIT_BONUS_XP;
  const days = Array.from({ length: Math.floor(end.diff(start, "days").days) + 1 }, (_, i) =>
    ymd(start.plus({ days: i })));
  // the 7 days ending on the selected day (not the month's first week: its future days would
  // pull it down)
  const last7 = Array.from({ length: 7 }, (_, i) => ymd(sel.minus({ days: 6 - i })));
  const avg = Math.round(last7.reduce((a, d) => a + (xpByDay.get(d) ?? 0), 0) / 7);
  const todayXP = (xpByDay.get(ymd(sel)) ?? 0) + habitBonus;

  return {
    habitBonus, todayXP, aura: levelOf(todayXP).name, trend: todayXP > avg ? "↑" : "↓",
    vals: days.map(d => levels.indexOf(levelOf(xpByDay.get(d) ?? 0))),
    // the legend: each level's colour and its top XP
    legend: levels.map(({ name, cls, max }) =>
      ({ name, cls, max: max === Infinity ? "30+" : max })),
  };
}
