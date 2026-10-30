// Habits this month: a bar per habit, how many days it was done (from the daily notes). Not on a page now.
import { H } from "../lib/helpers.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

export class Habits extends Widget {
  async data() {
    const selected = H.pageDay(this.dv);
    // { habitName: { area, days: Set } } — shared scan from helpers.js
    const habits = H.collectHabitDays(this.dv, selected.startOf("month"), selected.endOf("month"));
    return { names: Object.keys(habits), habits };
  }
  view({ names }) { return names.length ? html`` : html`<div>No habits this month.</div>`; }
  async after(root, { names, habits }) {
    if (!names.length) return;
    this.keep(await window.renderChart({
      type: "bar",
      data: { labels: names, datasets: [{ label: "Completions this month", data: names.map(n => habits[n].days.size), backgroundColor: H.chartColor("--winx-pink-deep", 0.6) }] },
      options: { indexAxis: "y", scales: { x: { beginAtZero: true }, y: { ticks: { autoSkip: false } } }, plugins: { legend: { display: false } } },
    }, root));
  }
}
