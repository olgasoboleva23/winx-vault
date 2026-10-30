// Energy and mood of the 7 days up to the page's day, from the daily notes (a gap where a day has no note).
// Not on a page now.
import { H } from "../lib/helpers.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

export class WeeklyState extends Widget {
  async data() {
    const selected = H.pageDay(this.dv), weekStart = selected.minus({ days: 6 });
    const byDay = new Map(this.dv.pages('"02 Areas/Personal/Daily Notes"')
      .where(p => p.date && p.date.ts >= weekStart.ts && p.date.ts <= selected.ts).map(p => [H.ymd(p.date), p]).array());
    const days = Array.from({ length: 7 }, (_, i) => selected.minus({ days: 6 - i }));
    return {
      labels: days.map(d => d.toFormat("MM-dd")),
      energy: days.map(d => byDay.get(H.ymd(d))?.energy ?? null),
      mood: days.map(d => byDay.get(H.ymd(d))?.mood ?? null),
    };
  }
  view() { return html``; }
  async after(root, { labels, energy, mood }) {
    this.keep(await window.renderChart({
      type: "line",
      data: { labels, datasets: [
        { label: "😴 Energy", data: energy, borderColor: H.chartColor("--winx-blue"), backgroundColor: H.chartColor("--winx-blue", 0.3), tension: 0.3 },
        { label: "😊 Mood", data: mood, borderColor: H.chartColor("--winx-pink-deep"), backgroundColor: H.chartColor("--winx-pink-deep", 0.3), tension: 0.3 },
      ] },
      options: { scales: { y: { min: 0, max: 10 } } },
    }, root));
  }
}
