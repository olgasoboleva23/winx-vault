const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));

const selected  = dv.current().date ?? dv.date("today");
const weekStart = selected.minus({ days: 6 });

const byDay = new Map(
  dv.pages('"02 Areas/Personal/Daily Notes"')
    .where(p => p.date && p.date.ts >= weekStart.ts && p.date.ts <= selected.ts)
    .map(p => [p.date.toFormat("yyyy-MM-dd"), p])
    .array()
);

// Full 7-day range; days without a note become null so the chart
// shows a gap instead of silently compressing missing days.
const days   = Array.from({ length: 7 }, (_, i) => selected.minus({ days: 6 - i }));
const labels = days.map(d => d.toFormat("MM-dd"));
const energy = days.map(d => byDay.get(d.toFormat("yyyy-MM-dd"))?.energy ?? null);
const mood   = days.map(d => byDay.get(d.toFormat("yyyy-MM-dd"))?.mood ?? null);

window.renderChart({
  type: "line",
  data: {
    labels,
    datasets: [
      {
        label: "😴 Energy",
        data: energy,
        borderColor: H.chartColor("--winx-blue"),
        backgroundColor: H.chartColor("--winx-blue", 0.3),
        tension: 0.3,
      },
      {
        label: "😊 Mood",
        data: mood,
        borderColor: H.chartColor("--winx-pink-deep"),
        backgroundColor: H.chartColor("--winx-pink-deep", 0.3),
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
