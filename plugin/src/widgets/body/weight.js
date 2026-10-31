// Weight: line chart of the last 30 days, the last value, change vs a week ago, a field to log today's weight,
// a button to the list. The same widget on the dashboard and the phone's Weight page.
import { html } from "../../ui/html.js";
import { Button } from "../../ui/component.js";
import { Widget } from "../widget.js";
import { addDays, dm, todayYmd } from "../../core/dates.js";
import { edit } from "../../core/files.js";
import { WeightLog } from "./weightLog.js";
import { chartColor } from "../../ui/chart.js";

const PATH = "02 Areas/Appearance/Weight.md";
const DAYS = 30;

export class Weight extends Widget {
  on = {
    save: async (e, form) => {
      const box = form.querySelector("input[name=kg]");
      const kg = Number(String(box.value).replace(",", "."));
      if (!kg || kg <= 0) return;
      await edit(PATH, c => new WeightLog(c).set(todayYmd(), kg));
      box.value = "";
    },
    list: () => this.app.workspace.openLinkText(PATH, "", false),
  };
  async data() {
    const file = this.app.vault.getAbstractFileByPath(PATH);
    if (!file) return { missing: true };
    const ws = new WeightLog(await this.app.vault.cachedRead(file)).entries, today = todayYmd();
    const last = ws.at(-1);
    const ref = last && [...ws].reverse().find(w => w.date <= addDays(last.date, -7));
    const days = Array.from({ length: DAYS }, (_, i) => addDays(today, i - DAYS + 1));
    const byDay = new Map(ws.map(w => [w.date, w.kg]));
    return { last, delta: ref ? +(last.kg - ref.kg).toFixed(1) : null, days, vals: days.map(d => byDay.get(d) ?? null) };
  }
  view({ missing, last, delta }) {
    if (missing) return html`<div>Create ${PATH}</div>`;
    return html`<div class="winx-weight">
      <div class="winx-weight-head">${last
        ? html`<span class="winx-weight-now">${last.kg} kg</span>${delta !== null ? html`<span class="winx-weight-delta">${delta > 0 ? "+" : ""}${delta} vs week ago</span>` : ""}`
        : html`<span class="winx-weight-delta">no entries yet</span>`}</div>
      <form class="winx-weight-add" data-action="save"><input name="kg" type="number" step="0.1" inputmode="decimal" placeholder="today, kg"><button type="submit">Save</button></form>
      ${new Button({ text: "✦ list", action: "list", kind: "pill", cls: "winx-weight-list" })}
    </div>`;
  }
  // the chart between the field and the list button: one point per logged day, gaps bridged by the line
  async after(root, { missing, days, vals }) {
    const seen = vals?.filter(v => v !== null) ?? [];
    if (missing || !seen.length) return;
    const box = root.querySelector(".winx-weight"), list = box.querySelector(".winx-weight-list");
    this.keep(await window.renderChart({
      type: "line",
      data: { labels: days.map(dm), datasets: [{ label: "⚖️ Weight", data: vals, spanGaps: true, borderColor: chartColor("--winx-pink-deep"), backgroundColor: chartColor("--winx-pink-deep", 0.3), tension: 0.3 }] },
      options: { plugins: { legend: { display: false } }, scales: { y: { suggestedMin: Math.min(...seen) - 0.5, suggestedMax: Math.max(...seen) + 0.5 } } },
    }, box));
    box.append(list);   // the chart went last: the button back under it
  }
}
