// Mobile shopping list: tap a row = bought (moves down, struck out); tap a bought row = back on the list.
// "+ add item" on top opens the search over everything bought before.
import { html } from "../../core/html.js";
import { Widget } from "../widget.js";
import { todayYmd, ymd } from "../../core/dates.js";
import { editLine } from "../../core/files.js";
import { MARKET, catOf, marketCats } from "./market.js";
import { addMarketItem } from "./marketSearch.js";
import { MarketItem } from "./marketItem.js";
import { Button } from "../../uikit/button.js";
import { Empty, Missing } from "../../uikit/empty.js";
import { GroupHeader } from "../../uikit/groupHeader.js";

export class MobileShopping extends Widget {
  on = {
    add: () => addMarketItem(),
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
      open,
      groups: marketCats.map(c => ({ c, items: open.filter(t => catOf(t) === c.tag) })).filter(g => g.items.length),
      bought: all.filter(t => t.completed && ymd(t.completion) === today),
    };
  }
  view({ missing, open, groups, bought }) {
    if (missing) return new Missing({ path: MARKET });
    const row = (t, isBought) => html`<button class="winx-mshop-row${isBought ? " bought" : ""}" data-action="toggle" data-line="${t.line}" data-name="${MarketItem.of(t).name}"><span class="winx-mshop-name">${MarketItem.of(t).name}</span><span class="winx-mshop-mark"></span></button>`;
    return html`<div class="winx-mshop">
      ${new Button({ text: "+ add item", action: "add", kind: "pill", cls: "winx-mshop-add" })}
      ${open.length ? "" : new Empty({ text: "✨ All bought" })}
      ${groups.map(({ c, items }) => html`${new GroupHeader({ label: c.label, count: items.length })}<div class="winx-mshop-list">${items.map(t => row(t, false))}</div>`)}
      ${bought.length ? html`<div class="winx-mshop-sep">bought today</div><div class="winx-mshop-list">${bought.map(t => row(t, true))}</div>` : ""}
    </div>`;
  }
}
