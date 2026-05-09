const selected   = dv.current().date;
const monthStart = selected.startOf("month");
const monthEnd   = selected.endOf("month");

// Helper — extract habit name from tag (#habit/area/name or #habit/name)
const habitName = tag => {
  const parts = tag.split("/");
  return parts.length >= 3 ? parts[2] : parts[1];
};

// Flatten all completed habit tasks from this month into {name, date} pairs
const habitTasks = dv.pages('"02 Areas/Personal/Daily Notes"')
  .where(p => p.date?.ts >= monthStart.ts && p.date?.ts <= monthEnd.ts)
  .array()
  .flatMap(page =>
    page.file.tasks.array()
      .filter(t => t.completed && t.tags?.some(tag => tag.startsWith("#habit/")))
      .map(t => ({
        name: habitName(t.tags.find(tag => tag.startsWith("#habit/"))),
        date: page.date.toFormat("yyyy-MM-dd"),
      }))
  );

if (!habitTasks.length) { dv.el("div", "No habits this month."); return; }

// Group by habit name — replaces manual habitDone accumulator
const grouped = Object.groupBy(habitTasks, t => t.name);
const habits  = Object.keys(grouped);

window.renderChart({
  type: "bar",
  data: {
    labels:   habits,
    datasets: [{
      label:           "Completions this month",
      data:            habits.map(h => grouped[h].length),
      backgroundColor: "rgba(216, 120, 168, 0.6)",
    }],
  },
  options: {
    indexAxis: "y",
    scales: {
      x: { beginAtZero: true },
      y: { ticks: { autoSkip: false } },
    },
    plugins: { legend: { display: false } },
  },
}, dv.container);
