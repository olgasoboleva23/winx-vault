// Mobile shopping list: tap a row = bought (moves down, struck out); tap a bought row = back on the list.
// An add field on top.
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";
import { todayYmd, ymd } from "../lib/dates.js";
import { editLine } from "../lib/files.js";
import { MARKET, addToMarket, catOf, marketCats, markBought, marketName, unmarkBought } from "../lib/market.js";

export class MobileShopping extends Widget {
  on = {
    add: async (e, form) => {
      const input = form.querySelector("input[name=item]"), v = input.value.trim();
      if (!v) return;
      await addToMarket(v, form.querySelector("select[name=cat]").value);
      input.value = "";
    },
    // instant feedback, the file write follows (and redraws)
    toggle: async (e, row) => {
      const bought = row.classList.contains("bought"), name = row.dataset.name;
      row.classList.toggle("bought");
      await editLine(MARKET, Number(row.dataset.line), line => !line.includes(name) ? line : bought ? unmarkBought(line) : markBought(line, todayYmd()));
    },
  };
  async data() {
    const page = this.dv.page(MARKET);
    if (!page) return { missing: true };
    const today = todayYmd(), all = page.file.tasks.array(), open = all.filter(t => !t.completed);
    return {
      cats: marketCats, open,
      groups: marketCats.map(c => ({ c, items: open.filter(t => catOf(t) === c.tag) })).filter(g => g.items.length),
      bought: all.filter(t => t.completed && ymd(t.completion) === today),
    };
  }
  view({ missing, cats, open, groups, bought }) {
    if (missing) return html`<p>Market file not found.</p>`;
    const row = (t, isBought) => html`<button class="winx-mshop-row${isBought ? " bought" : ""}" data-action="toggle" data-line="${t.line}" data-name="${marketName(t)}"><span class="winx-mshop-name">${marketName(t)}</span><span class="winx-mshop-mark"></span></button>`;
    return html`<div class="winx-mshop">
      <form class="winx-mshop-add" data-action="add"><input name="item" type="text" placeholder="+ add item" enterkeyhint="done"><select name="cat">${cats.map(c => html`<option value="${c.tag}">${c.label}</option>`)}</select><button type="submit">Add</button></form>
      ${open.length ? "" : html`<div class="winx-mshop-empty">✨ All bought</div>`}
      ${groups.map(({ c, items }) => html`<div class="market-group-header"><span>${c.label}</span><span class="market-count">${items.length}</span></div><div class="winx-mshop-list">${items.map(t => row(t, false))}</div>`)}
      ${bought.length ? html`<div class="winx-mshop-sep">bought today</div><div class="winx-mshop-list">${bought.map(t => row(t, true))}</div>` : ""}
    </div>`;
  }
}
