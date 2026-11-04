// Celestial Market: the shopping list by category, a round ✓ per item (a sparkle, then it's written as bought),
// what is running low soon and links to the market and the supplies; ＋ by the card's title opens the search.
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import { todayYmd } from "../../core/dates.js";
import { editLine } from "../../core/files.js";
import { MARKET, catOf, marketCats, marketState, supplyStats } from "./market.js";
import { MarketItem } from "./marketItem.js";
import { Empty, Missing } from "../../uikit/empty.js";
import { GroupHeader } from "../../uikit/groupHeader.js";
import { NoteLink } from "../../uikit/noteLink.js";
import { Button } from "../../uikit/button.js";
import { addMarketItem } from "./marketSearch.js";

export class CelestialMarket extends Widget {
  on = {
    add: () => addMarketItem(),
    // let the sparkle play first, then write (the write redraws the widget)
    buy: async (e, el) => {
      const row = el.closest(".winx-market__item");
      if (row.classList.contains("winx-market__item--bought")) return;
      row.classList.add("winx-market__item--bought");
      await new Promise(r => window.setTimeout(r, 650));
      const same = line => {
        const item = new MarketItem(line);
        return !item.isBought && item.name === el.dataset.name;
      };
      await editLine(MARKET, Number(el.dataset.line), same, line => new MarketItem(line).bought(todayYmd()));
    },
  };
  async data() {
    const page = this.dv.page(MARKET);
    if (!page) return { missing: true };
    const mkt = marketState(this.dv);
    const tasks = page.file.tasks.where(t => !t.completed).array();
    // a row: its line (to find it again), its name (to check it's the same item), its label
    const row = t => {
      const item = MarketItem.of(t);
      return { line: t.line, name: item.name, label: item.label };
    };
    const n = tasks.length;
    return {
      empty: !n,
      left: `${n} item${n === 1 ? "" : "s"} left`,
      groups: marketCats
        .map(cat => ({ cat, rows: tasks.filter(t => catOf(t) === cat.tag).map(row) }))
        .filter(g => g.rows.length),
      soon: supplyStats(mkt.history, todayYmd()).filter(s => s.due && !mkt.open.has(s.name))
        .map(s => s.name).join(", "),
    };
  }
  cardButton() {
    return new Button({ icon: "+", title: "add item", action: "add", kind: "text", cls: "winx-widget__add" });
  }
  // one item of the list, its ✓ with what finds its line again
  item({ line, name, label }) {
    const ids = html` data-action="buy" data-line="${line}" data-name="${name}"`;
    return html`<div class="winx-market__item">
      <span class="winx-market__text">${label}</span>
      <button class="winx-market__buy" aria-label="bought" title="bought"${ids}></button>
    </div>`;
  }
  link(text, path) { return new NoteLink({ text, path, kind: "text", cls: "winx-market__link" }); }
  view({ missing, empty, left, groups, soon }) {
    if (missing) return new Missing({ path: MARKET });
    return html`<div class="winx-market">
      <div class="winx-market__list">
        ${empty ? new Empty({ text: "Merchant inventory cleared" }) : ""}
        ${groups.map(({ cat, rows }) => html`
          ${new GroupHeader({ label: cat.label, count: rows.length })}
          ${rows.map(r => this.item(r))}`)}
      </div>
      ${soon ? html`<div class="winx-market__soon">⏳ running low soon: ${soon}</div>` : ""}
      <div class="winx-market__footer">
        <span>${left}</span>
        ${this.link("✦ open market", "00 System/Data/Celestial Market")}
        ${this.link("✦ supplies", "00 System/Data/Supplies")}
      </div>
    </div>`;
  }
}
