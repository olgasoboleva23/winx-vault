// Celestial Market: the shopping list by category, a round ✓ per item (a sparkle, then it's written as bought),
// what is running low soon, and links to the market and the supplies.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

const FILE_PATH = "00 System/Data/Celestial Market.md";

export class CelestialMarket extends Widget {
  on = {
    // let the sparkle play first, then write (the write redraws the widget)
    buy: async (e, el) => {
      const row = el.closest(".market-item");
      if (row.classList.contains("bought")) return;
      row.classList.add("bought");
      await new Promise(r => setTimeout(r, 650));
      const line = Number(el.dataset.line), today = H.today();
      await this.app.vault.process(this.app.vault.getAbstractFileByPath(FILE_PATH), c => {
        const lines = c.split("\n");
        if (lines[line] !== undefined) lines[line] = L.markBought(lines[line], today);
        return lines.join("\n");
      });
    },
    open: (e, el) => this.app.workspace.openLinkText(el.dataset.path, "", false),
  };
  async data() {
    const page = this.dv.page("00 System/Data/Celestial Market");
    if (!page) return { missing: true };
    const { marketCategories } = await H.loadConfig();
    const mkt = H.marketState(this.dv);
    const cats = [...marketCategories, { label: "✦ Other", tag: "#other" }];
    const catOf = t => t.tags?.find(tag => cats.some(c => c.tag === tag)) ?? "#other";
    const items = page.file.tasks.where(t => !t.completed).array();
    return {
      items, groups: cats.map(cat => ({ cat, items: items.filter(t => catOf(t) === cat.tag) })).filter(g => g.items.length),
      soon: L.supplyStats(mkt.history, H.today()).filter(s => s.due && !mkt.open.has(s.name)).map(s => s.name),
    };
  }
  view({ missing, items, groups, soon }) {
    if (missing) return html`<p>Market file not found.</p>`;
    const link = (text, path) => html`<span class="market-open" data-action="open" data-path="${path}">${text}</span>`;
    return html`<div class="winx-celestial-market">
      <div class="market-list">
        ${items.length ? "" : html`<div class="market-empty">✨ Merchant inventory cleared</div>`}
        ${groups.map(({ cat, items }) => html`
          <div class="market-group-header"><span>${cat.label}</span><span class="market-count">${items.length}</span></div>
          ${items.map(t => html`<div class="market-item"><span class="market-text">${t.text.replace(/#[\w/]+/g, "").trim()}</span><button class="market-buy" aria-label="bought" title="bought" data-action="buy" data-line="${t.line}"></button></div>`)}`)}
      </div>
      ${soon.length ? html`<div class="market-soon">⏳ running low soon: ${soon.join(", ")}</div>` : ""}
      <div class="market-footer"><span>${items.length} item${items.length === 1 ? "" : "s"} left</span>${link("✦ open market", "00 System/Data/Celestial Market")}${link("✦ supplies", "00 System/Data/Supplies")}</div>
    </div>`;
  }
}
