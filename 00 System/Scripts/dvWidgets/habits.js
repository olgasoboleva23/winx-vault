const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));

const selected   = dv.current().date ?? dv.date("today");
const monthStart = selected.startOf("month");
const monthEnd   = selected.endOf("month");

// { habitName: { area, days: Set } } — shared scan from helpers.js
const habits = H.collectHabitDays(dv, monthStart, monthEnd);
const names  = Object.keys(habits);

if (!names.length) { dv.el("div", "No habits this month."); return; }

window.renderChart({
  type: "bar",
  data: {
    labels:   names,
    datasets: [{
      label:           "Completions this month",
      data:            names.map(n => habits[n].days.size),
      backgroundColor: H.chartColor("--winx-pink-deep", 0.6),
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
