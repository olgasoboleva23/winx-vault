const H = winx.H;
const { xpMap, areaMap, areas, HABIT_BONUS_XP, HABIT_BONUS_THRESHOLD } = await H.loadConfig();

const sel        = H.pageDay(dv);
const monthStart = sel.startOf("month");
const monthEnd   = sel.endOf("month");

// --- task XP per area, last 4 weeks up to the selected date ---
const since = sel.minus({ days: 27 }).startOf("day");
const scores = Object.fromEntries(
  areas.map(a => [a.name, 0])
);

for (const t of dv.pages('"02 Areas/Personal/Tasks"').file.tasks.where(t => t.completed && t.completion && t.completion.ts >= since.ts && t.completion.ts <= sel.endOf("day").ts)) {
  const area = Object.entries(areaMap).find(([tag]) => t.tags.includes(tag))?.[1];
  if (area) scores[area] += H.taskXp(t, xpMap);
}

// --- habit bonus per area — shared scan from helpers.js ---
for (const { area, days } of Object.values(H.collectHabitDays(dv, monthStart, monthEnd))) {
  if (days.size >= HABIT_BONUS_THRESHOLD) {
    const areaLabel = areaMap[area];
    if (areaLabel) scores[areaLabel] += HABIT_BONUS_XP;
  }
}

// --- radar chart ---
window.renderChart({
  type: "radar",
  data: {
    labels:   Object.keys(scores),
    datasets: [{
      label:           "Areas",
      data:            Object.values(scores),
      backgroundColor: H.chartColor("--winx-pink-deep", 0.3),
      borderColor:     H.chartColor("--winx-pink-deep"),
      borderWidth:     2,
    }],
  },
  options: {
    plugins: { legend: { display: false } },
  },
}, dv.container);

dv.container.createEl("div", { text: "last 4 weeks", cls: "winx-goal-min" }).style.textAlign = "center";
