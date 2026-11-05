// The XP widgets' controller. Level: total XP of the tasks done up to the page's day, the level it
// makes, progress to the next; HP (the missed tasks against today's done ones) and MP (the day of
// the cycle), rules in models/vitals.js. Life Areas: a radar of XP per area over the last 4 weeks,
// plus the habit bonus this month. XP Today: the day's XP (with the habit bonus), its aura level,
// ↑/↓ against the 7-day average, the month as a heatmap. The markup: widgets/xp/.
import config from "../helpers/config.js";
import { pageDay, todayYmd, ymd } from "../helpers/dates.js";
import { Task } from "../models/task.js";
import { levelInfo, taskXp } from "../models/xp.js";
import { mana, mpLine, mpTable, vitals } from "../models/vitals.js";
import { cycleLog } from "./cycle.js";
import { dailyFolder, TASKS } from "../helpers/paths.js";
import { chartColor } from "../helpers/chart.js";

// Single pass over the daily notes (in `folder`) in [start, end]:
// { habitName: { area: "#area/x", days: Set<"yyyy-MM-dd"> } }
// Tag shape is #habit/area/name, or #habit/name (area doubles as name).
export function collectHabitDays(dv, folder, start, end) {
  const habits = {};

  for (const page of dv.pages(`"${folder}"`)
      .where(p => p.date?.ts >= start.ts && p.date?.ts <= end.ts)) {
    const dateStr = ymd(page.date);

    for (const t of page.file.tasks) {
      const habitTag = t.tags?.find(tag => tag.startsWith("#habit/"));

      if (!habitTag || !t.completed) continue;
      const [, areaSlug, habitPart] = habitTag.split("/");
      const name = habitPart ?? areaSlug;
      (habits[name] ??= { area: `#area/${areaSlug}`, days: new Set() }).days.add(dateStr);
    }
  }

  return habits;
}

export async function loadLevelToday({ dv }) {
  const { xpMap } = config;
  const day = ymd(pageDay(dv)), today = todayYmd();
  const tasks = dv.pages(`"${TASKS}"`).file.tasks.array();
  const total = tasks.filter(t => t.completed && ymd(t.completion) <= day)
    .reduce((sum, t) => sum + taskXp(t, xpMap), 0);
  const all = tasks.map(t => Task.of(t));
  const v = vitals({
    missed: all.filter(t => t.isOverdue(today)),
    doneToday: all.filter(t => t.doneOn === today),
  });
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
