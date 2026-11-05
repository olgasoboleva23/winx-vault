// The writes of the Celestial Market (00 System/Data/Celestial Market.md): an item on the list
// ("+ add item": a search of everything bought before, by category, the most bought first, or a new
// one typed), an item bought (✓), an item running low back on the list (Supplies).
import { Notice } from "obsidian";
import { Search } from "../uikit/search.ts";
import { Form } from "../uikit/form.ts";
import { dm, todayYmd } from "../core/dates.js";
import { appendLine, editLine } from "../core/files.js";
import { MARKET, marketCats, marketChoices, marketState } from "../widgets/market/market.js";
import { MarketItem } from "../models/marketItem.js";
import { findChoices } from "../core/find.js";
import { dataview } from "../core/plugins.js";
import { app } from "../core/app.js";

const catLabel = tag => marketCats.find(c => c.tag === tag)?.label ?? tag;

export async function addMarketItem() {
  const { history, open } = marketState(dataview());
  const choices = marketChoices(history, open);
  // a category header over the first row of each category
  const find = q => findChoices(choices, q)
    .map((c, i, all) => ({ ...c, header: !c.isNew && c.tag !== all[i - 1]?.tag }));
  const pick = await Search.pick(app, "Find or add an item…", find, (c, el) => {
    if (c.header) el.createDiv({ cls: "winx-search__group", text: catLabel(c.tag) });
    const row = el.createDiv({ cls: "winx-search__row" });
    row.createSpan({ text: c.isNew ? `+ new: ${c.name}` : c.name });
    const note = c.isNew ? "" : c.onList ? "on the list" : `×${c.buys} · ${dm(c.last)}`;
    row.createSpan({ cls: "winx-search__note", text: note });
  });

  if (!pick) return;
  if (pick.onList) return void new Notice(`✦ ${pick.name} is on the list already`);
  const tag = pick.isNew ? (await Form.ask(app, `✦ ${pick.name}`, [
    {
      name: "Category",
      key: "tag",
      options: marketCats.map(c => ({ label: c.label, value: c.tag })),
    },
  ], { required: ["tag"], submit: "Add" }))?.tag : pick.tag;

  if (tag) await addToMarket(pick.name, tag);
}

export const addToMarket = (name, tag) => appendLine(MARKET, `- [ ] ${name} ${tag}`);

export const celestialMarketActions = () => ({
  add: () => addMarketItem(),

  // a row as bought, if its line is still that item
  buy: ({ line, name }) => {
    const same = l => {
      const item = new MarketItem(l);

      return !item.isBought && item.name === name;
    };

    return editLine(MARKET, line, same, l => new MarketItem(l).bought(todayYmd()));
  },
});

// low(name, tag): back on the Celestial Market's list
export const suppliesActions = () => ({
  low: async (name, tag) => {
    await addToMarket(name, tag);
    new Notice(`✦ ${name} → Celestial Market`);
  },
});
