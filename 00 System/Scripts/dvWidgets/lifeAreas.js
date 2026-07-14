const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
const { xpMap, areaMap, areas, HABIT_BONUS_XP, HABIT_BONUS_THRESHOLD } = await H.loadConfig();

const sel        = dv.current().date ?? dv.date("today");
const monthStart = sel.startOf("month");
const monthEnd   = sel.endOf("month");

// --- task XP per area ---
const scores = Object.fromEntries(
  areas.map(a => [a.name, 0])
);

for (const t of dv.pages('"02 Areas/Personal/Tasks"').file.tasks.where(t => t.completed && t.completion?.ts <= sel.ts)) {
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
