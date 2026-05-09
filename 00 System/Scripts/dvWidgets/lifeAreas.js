const sel        = dv.current().date ?? dv.date("today");
const monthStart = sel.startOf("month");
const monthEnd   = sel.endOf("month");

const config = eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/config.js"));
const { xpMap, areaMap, areas, HABIT_BONUS_XP, HABIT_BONUS_THRESHOLD } = config;

// --- task XP per area ---
const scores = Object.fromEntries(
  areas.map(a => [a.name, 0])
);

for (const t of dv.pages('"02 Areas/Personal/Tasks"').file.tasks.where(t => t.completed && t.completion?.ts <= sel.ts)) {
  const xp   = Object.entries(xpMap).find(([tag])  => t.tags.includes(tag))?.[1]  ?? 0;
  const area = Object.entries(areaMap).find(([tag]) => t.tags.includes(tag))?.[1];
  if (area) scores[area] += xp;
}

// --- habit bonus per area ---
// Single pass over monthly notes — builds habitDone while filtering in one loop
const habitDone = {};

for (const page of dv.pages('"02 Areas/Personal/Daily Notes"').where(p => p.date?.ts >= monthStart.ts && p.date?.ts <= monthEnd.ts)) {
  const dateStr = page.date.toFormat("yyyy-MM-dd");
  for (const t of page.file.tasks) {
    const habitTag = t.tags?.find(tag => tag.startsWith("#habit/"));
    if (!habitTag || !t.completed) continue;
    const [, areaSlug, habitPart] = habitTag.split("/");
    const name    = habitPart ?? areaSlug;
    const areaKey = `#area/${areaSlug}`;
    (habitDone[name] ??= { area: areaKey, days: new Set() }).days.add(dateStr);
  }
}

for (const { area, days } of Object.values(habitDone)) {
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
      backgroundColor: "rgba(216, 120, 168, 0.3)",
      borderColor:     "rgba(216, 120, 168, 1)",
      borderWidth:     2,
    }],
  },
  options: {
    plugins: { legend: { display: false } },
  },
}, dv.container);
