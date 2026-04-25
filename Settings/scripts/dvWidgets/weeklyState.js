const selected = dv.current().date ?? dv.date("today");
const weekStart = selected.minus({ days: 6 });

const pages = dv.pages('"Daily Notes"')
  .where(p => p.date && p.date.ts >= weekStart.ts && p.date.ts <= selected.ts)
  .sort(p => p.date);

const labels = pages.map(p => p.date.toFormat("MM-dd")).array();
const energy = pages.map(p => p.energy ?? null).array();
const mood = pages.map(p => p.mood ?? null).array();

window.renderChart({
  type: "line",
  data: {
    labels,
    datasets: [
      {
        label: "😴 Energy",
        data: energy,
        borderColor: "rgba(168, 200, 240, 1)",
        backgroundColor: "rgba(168, 200, 240, 0.3)",
        tension: 0.3,
      },
      {
        label: "😊 Mood",
        data: mood,
        borderColor: "rgba(216, 120, 168, 1)",
        backgroundColor: "rgba(216, 120, 168, 0.3)",
        tension: 0.3,
      },
    ],
  },
  options: {
    scales: {
      y: { min: 0, max: 10 },
    },
  },
}, dv.container);
