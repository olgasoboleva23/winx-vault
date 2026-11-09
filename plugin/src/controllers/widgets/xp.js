// The XP widgets' controller. Level: total XP of the tasks done up to the page's day, the level it
// makes, progress to the next; HP (the missed tasks against today's done ones) and MP (the day of
// the cycle), rules in models/vitals.js. Life Areas: a radar of XP per area over the last 4 weeks.
// XP Today: the day's XP, its aura level, ↑/↓ against the 7-day average, the month as a heatmap.
// The markup: widgets/xp/.
import config from "#/helpers/config.js";
import { pageDay, todayYmd, ymd } from "#/helpers/dates.js";
import { T } from "#/models/calendarData.js";
import { taskStore } from "#/store/tasks.js";
import { levelInfo, taskXp } from "#/models/xp.js";
import { mana, mpLine, mpTable, vitals } from "#/models/vitals.js";
import { cycleLog } from "./cycle.js";
import { chartColor } from "#/helpers/chart.js";

export async function loadLevelToday({ dv }) {
  const { xpMap } = config;
  const day = ymd(pageDay(dv)), today = todayYmd();
  const all = taskStore.tasks.map(T);
  const total = all.filter(t => t.isDone && t.doneOn && t.doneOn <= day)
    .reduce((sum, t) => sum + taskXp(t, xpMap), 0);
  const v = vitals({
    missed: all.filter(t => t.isOverdue(today)),
    doneToday: all.filter(t => t.doneOn === today),
  });
  const { base, step } = config.levelCost, mp = mana(cycleLog(dv)?.on(today));
  const { level, progress, cost } = levelInfo(total, base, step);
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
export async function loadLifeAreas({ dv }) {
  const { xpMap, areaMap, areas } = config;
  const sel = pageDay(dv), since = ymd(sel.minus({ days: 27 })), until = ymd(sel);
  const scores = Object.fromEntries(areas.map(a => [a.name, 0]));
  // task XP per area, last 4 weeks up to the selected date
  const done = taskStore.tasks.map(T)
    .filter(t => t.isDone && t.doneOn && t.doneOn >= since && t.doneOn <= until);

  for (const t of done) {
    const area = areaMap[t.area];

    if (area) scores[area] += taskXp(t, xpMap);
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

export async function loadXpToday({ dv }) {
  const { xpMap, levels } = config;
  const sel = pageDay(dv), start = sel.startOf("month"), end = sel.endOf("month");
  const levelOf = xp => levels.find(l => xp <= l.max) ?? levels.at(-1);
  // task XP by completion day
  const xpByDay = new Map();

  for (const t of taskStore.tasks.map(T).filter(t => t.isDone && t.doneOn))
    xpByDay.set(t.doneOn, (xpByDay.get(t.doneOn) ?? 0) + taskXp(t, xpMap));

  const days = Array.from({ length: Math.floor(end.diff(start, "days").days) + 1 }, (_, i) =>
    ymd(start.plus({ days: i })));
  // the 7 days ending on the selected day (not the month's first week: its future days would
  // pull it down)
  const last7 = Array.from({ length: 7 }, (_, i) => ymd(sel.minus({ days: 6 - i })));
  const avg = Math.round(last7.reduce((a, d) => a + (xpByDay.get(d) ?? 0), 0) / 7);
  const todayXP = xpByDay.get(ymd(sel)) ?? 0;

  return {
    todayXP, aura: levelOf(todayXP).name, trend: todayXP > avg ? "↑" : "↓",
    vals: days.map(d => levels.indexOf(levelOf(xpByDay.get(d) ?? 0))),
    // the legend: each level's colour and its top XP
    legend: levels.map(({ name, cls, max }) =>
      ({ name, cls, max: max === Infinity ? "30+" : max })),
  };
}
