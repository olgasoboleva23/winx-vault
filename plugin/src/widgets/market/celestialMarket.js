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
      const row = el.closest(".market-item");
      if (row.classList.contains("bought")) return;
      row.classList.add("bought");
      await new Promise(r => setTimeout(r, 650));
      await editLine(MARKET, Number(el.dataset.line), line => new MarketItem(line).bought(todayYmd()));
    },
  };
  async data() {
    const page = this.dv.page(MARKET);
    if (!page) return { missing: true };
    const mkt = marketState(this.dv);
    const items = page.file.tasks.where(t => !t.completed).array();
    return {
      items, groups: marketCats.map(cat => ({ cat, items: items.filter(t => catOf(t) === cat.tag) })).filter(g => g.items.length),
      soon: supplyStats(mkt.history, todayYmd()).filter(s => s.due && !mkt.open.has(s.name)).map(s => s.name),
    };
  }
  cardButton() { return new Button({ icon: "+", title: "add item", action: "add", kind: "text", cls: "winx-card-add" }); }
  view({ missing, items, groups, soon }) {
    if (missing) return new Missing({ path: MARKET });
    const link = (text, path) => new NoteLink({ text, path, kind: "text", cls: "market-open" });
    return html`<div class="winx-celestial-market">
      <div class="market-list">
        ${items.length ? "" : new Empty({ text: "✨ Merchant inventory cleared" })}
        ${groups.map(({ cat, items }) => html`
          ${new GroupHeader({ label: cat.label, count: items.length })}
          ${items.map(t => html`<div class="market-item"><span class="market-text">${t.text.replace(/#[\w/]+/g, "").trim()}</span><button class="market-buy" aria-label="bought" title="bought" data-action="buy" data-line="${t.line}"></button></div>`)}`)}
      </div>
      ${soon.length ? html`<div class="market-soon">⏳ running low soon: ${soon.join(", ")}</div>` : ""}
      <div class="market-footer"><span>${items.length} item${items.length === 1 ? "" : "s"} left</span>${link("✦ open market", "00 System/Data/Celestial Market")}${link("✦ supplies", "00 System/Data/Supplies")}</div>
    </div>`;
  }
}
