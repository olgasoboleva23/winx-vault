// "+ add item": search everything bought before (by category, the most bought first) or type a new one.
import { Notice } from "obsidian";
import { Search } from "../../uikit/search.ts";
import { Form } from "../../uikit/form.ts";
import { dm } from "../../core/dates.js";
import { addToMarket, marketCats, marketChoices, marketState } from "./market.js";
import { findChoices } from "../../core/find.js";

const catLabel = tag => marketCats.find(c => c.tag === tag)?.label ?? tag;

export async function addMarketItem() {
  const { history, open } = marketState(app.plugins.plugins.dataview.api);
  const choices = marketChoices(history, open);
  // a category header over the first row of each category
  const find = q => findChoices(choices, q).map((c, i, all) => ({ ...c, header: !c.isNew && c.tag !== all[i - 1]?.tag }));
  const pick = await Search.pick(app, "Find or add an item…", find, (c, el) => {
    if (c.header) el.createDiv({ cls: "winx-search-group", text: catLabel(c.tag) });
    const row = el.createDiv({ cls: "winx-search-row" });
    row.createSpan({ text: c.isNew ? `+ new: ${c.name}` : c.name });
    row.createSpan({ cls: "winx-search-note", text: c.isNew ? "" : c.onList ? "on the list" : `×${c.buys} · ${dm(c.last)}` });
  });
  if (!pick) return;
  if (pick.onList) return void new Notice(`✦ ${pick.name} is on the list already`);
  const tag = pick.isNew ? (await Form.ask(app, `✦ ${pick.name}`, [
    { name: "Category", key: "tag", options: marketCats.map(c => ({ label: c.label, value: c.tag })) },
  ], { required: ["tag"], submit: "Add" }))?.tag : pick.tag;
  if (tag) await addToMarket(pick.name, tag);
}
