// Supplies: what is bought again and again (from the Celestial Market's done items), how long since the last
// time against the usual gap, and "running low" to put one back on the shopping list.
import { Notice } from "obsidian";
import { bem, html } from "../../core/html.js";
import { Button } from "../../uikit/button.js";
import { Widget } from "../widget.js";
import { todayYmd } from "../../core/dates.js";
import { addToMarket, marketCats, marketState, supplyStats } from "./market.js";
import { Empty } from "../../uikit/empty.js";
import { GroupHeader } from "../../uikit/groupHeader.js";

export class Supplies extends Widget {
  on = {
    low: async (e, el) => {
      await addToMarket(el.dataset.name, el.dataset.tag);
      new Notice(`✦ ${el.dataset.name} → Celestial Market`);
    },
  };
  async data() {
    const { history, open } = marketState(this.dv);
    const stats = supplyStats(history, todayYmd());
    const groupOf = s => marketCats.some(c => c.tag === s.tag) ? s.tag : "#other";
    // a row: how long since the last time against the usual gap, or that it's on the list already
    const row = s => {
      const listed = open.has(s.name);
      const info = listed ? "on the shopping list ✦"
        : s.avg ? `${s.since} of ~${s.avg} days${s.due ? " ⏳" : ""}`
        : `bought ${s.buys} times`;
      return { name: s.name, tag: s.tag, due: s.due, listed, info };
    };
    return {
      empty: !stats.length,
      groups: marketCats
        .map(cat => ({ label: cat.label, 
          rows: stats.filter(s => groupOf(s) === cat.tag).map(row),
        }))
        .filter(g => g.rows.length),
    };
  }
  row({ name, tag, due, listed, info }) {
    const low = new Button({
      text: "running low", action: "low", kind: "pill", data: { name, tag },
    });
    return html`<div class="${bem("winx-supplies__row", { due })}">
      <span class="winx-supplies__name">${name}</span>
      <span class="winx-supplies__info">${info}</span>
      ${listed ? "" : low}
    </div>`;
  }
  view({ empty, groups }) {
    return html`<div class="winx-supplies">
      ${empty ? new Empty({ text: "Nothing bought twice yet" }) : ""}
      ${groups.map(g => html`
        ${new GroupHeader({ label: g.label })}
        ${g.rows.map(r => this.row(r))}`)}
    </div>`;
  }
}
