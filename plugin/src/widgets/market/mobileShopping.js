// Mobile shopping list: tap a row = bought (moves down, struck out); tap a bought row = back on the list.
// An add field on top.
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import { todayYmd, ymd } from "../../core/dates.js";
import { editLine } from "../../core/files.js";
import { MARKET, addToMarket, catOf, marketCats } from "./market.js";
import { MarketItem } from "./marketItem.js";
import { AddForm } from "../../uikit/addForm.js";
import { Empty, Missing } from "../../uikit/empty.js";
import { GroupHeader } from "../../uikit/groupHeader.js";

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
      await editLine(MARKET, Number(row.dataset.line), line => !line.includes(name) ? line : bought ? new MarketItem(line).unbought() : new MarketItem(line).bought(todayYmd()));
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
    if (missing) return new Missing({ path: MARKET });
    const row = (t, isBought) => html`<button class="winx-mshop-row${isBought ? " bought" : ""}" data-action="toggle" data-line="${t.line}" data-name="${MarketItem.of(t).name}"><span class="winx-mshop-name">${MarketItem.of(t).name}</span><span class="winx-mshop-mark"></span></button>`;
    return html`<div class="winx-mshop">
      ${new AddForm({ action: "add", input: { name: "item", type: "text", placeholder: "+ add item", enterkeyhint: "done" }, extra: html`<select name="cat">${cats.map(c => html`<option value="${c.tag}">${c.label}</option>`)}</select>`, submit: "Add" })}
      ${open.length ? "" : new Empty({ text: "✨ All bought" })}
      ${groups.map(({ c, items }) => html`${new GroupHeader({ label: c.label, count: items.length })}<div class="winx-mshop-list">${items.map(t => row(t, false))}</div>`)}
      ${bought.length ? html`<div class="winx-mshop-sep">bought today</div><div class="winx-mshop-list">${bought.map(t => row(t, true))}</div>` : ""}
    </div>`;
  }
}
