// Mobile shopping list: tap a row = bought (moves down, struck out); tap a bought row = back on the list.
// An add field on top.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

const FILE_PATH = "00 System/Data/Celestial Market.md";

export class MobileShopping extends Widget {
  on = {
    add: async (e, form) => {
      const input = form.querySelector("input[name=item]"), v = input.value.trim();
      if (!v) return;
      await H.addToMarket(v, form.querySelector("select[name=cat]").value);
      input.value = "";
    },
    // instant feedback, the file write follows (and redraws)
    toggle: async (e, row) => {
      const bought = row.classList.contains("bought"), line = Number(row.dataset.line), name = row.dataset.name, today = H.today();
      row.classList.toggle("bought");
      await this.app.vault.process(this.app.vault.getAbstractFileByPath(FILE_PATH), c => {
        const lines = c.split("\n");
        if (lines[line] !== undefined && lines[line].includes(name)) lines[line] = bought ? L.unmarkBought(lines[line]) : L.markBought(lines[line], today);
        return lines.join("\n");
      });
    },
  };
  async data() {
    const page = this.dv.page("00 System/Data/Celestial Market");
    if (!page) return { missing: true };
    const { marketCategories } = await H.loadConfig();
    const today = H.today(), cats = [...marketCategories, { label: "✦ Other", tag: "#other" }];
    const catOf = t => t.tags?.find(tag => cats.some(c => c.tag === tag)) ?? "#other";
    const all = page.file.tasks.array(), open = all.filter(t => !t.completed);
    return {
      cats, open,
      groups: cats.map(c => ({ c, items: open.filter(t => catOf(t) === c.tag) })).filter(g => g.items.length),
      bought: all.filter(t => t.completed && H.ymd(t.completion) === today),
    };
  }
  view({ missing, cats, open, groups, bought }) {
    if (missing) return html`<p>Market file not found.</p>`;
    const row = (t, isBought) => html`<button class="winx-mshop-row${isBought ? " bought" : ""}" data-action="toggle" data-line="${t.line}" data-name="${H.marketName(t)}"><span class="winx-mshop-name">${H.marketName(t)}</span><span class="winx-mshop-mark"></span></button>`;
    return html`<div class="winx-mshop">
      <form class="winx-mshop-add" data-action="add"><input name="item" type="text" placeholder="+ add item" enterkeyhint="done"><select name="cat">${cats.map(c => html`<option value="${c.tag}">${c.label}</option>`)}</select><button type="submit">Add</button></form>
      ${open.length ? "" : html`<div class="winx-mshop-empty">✨ All bought</div>`}
      ${groups.map(({ c, items }) => html`<div class="market-group-header"><span>${c.label}</span><span class="market-count">${items.length}</span></div><div class="winx-mshop-list">${items.map(t => row(t, false))}</div>`)}
      ${bought.length ? html`<div class="winx-mshop-sep">bought today</div><div class="winx-mshop-list">${bought.map(t => row(t, true))}</div>` : ""}
    </div>`;
  }
}
