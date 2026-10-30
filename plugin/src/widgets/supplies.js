// Supplies: what is bought again and again (from the Celestial Market's done items), how long since the last
// time against the usual gap, and "running low" to put one back on the shopping list.
import { Notice } from "obsidian";
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { html } from "../ui/html.js";
import { Button } from "../ui/component.js";
import { Widget } from "./widget.js";

export class Supplies extends Widget {
  on = {
    low: async (e, el) => { await H.addToMarket(el.dataset.name, el.dataset.tag); new Notice(`✦ ${el.dataset.name} → Celestial Market`); },
  };
  async data() {
    const { marketCategories } = await H.loadConfig();
    const { history, open } = H.marketState(this.dv);
    const cats = [...marketCategories, { label: "✦ Other", tag: "#other" }];
    return { stats: L.supplyStats(history, H.today()), open, cats };
  }
  view({ stats, open, cats }) {
    const groupOf = s => cats.some(c => c.tag === s.tag) ? s.tag : "#other";
    const row = s => {
      const listed = open.has(s.name);
      const info = listed ? "on the shopping list ✦" : s.avg ? `${s.since} of ~${s.avg} days${s.due ? " ⏳" : ""}` : `bought ${s.buys} times`;
      const low = new Button({ text: "running low", action: "low", kind: "pill", cls: "winx-open-note-btn", data: { name: s.name, tag: s.tag } });
      return html`<div class="winx-supply${s.due ? " due" : ""}"><span class="winx-supply-name">${s.name}</span><span class="winx-supply-info">${info}</span>${listed ? "" : low}</div>`;
    };
    return html`<div class="winx-supplies">
      ${stats.length ? "" : html`<div>Nothing bought twice yet</div>`}
      ${cats.map(cat => { const items = stats.filter(s => groupOf(s) === cat.tag); return items.length ? html`<div class="market-group-header">${cat.label}</div>${items.map(row)}` : ""; })}
    </div>`;
  }
}
