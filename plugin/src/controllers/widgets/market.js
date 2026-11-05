// The Celestial Market's controller (00 System/Data/Celestial Market.md) and the Supplies'. The
// list by category with a round ✓ per item, what runs low soon; Supplies: what is bought again and
// again, how long since the last time against the usual gap. Writes: an item on the list (＋: a
// search of everything bought before, the most bought first, or a new one typed), an item bought
// (✓), an item running low back on the list. The markup: widgets/market/.
import { dm, todayYmd, ymd } from "#/helpers/dates.js";
import { catOf, MARKET, marketCats, marketChoices, supplyStats } from "#/models/market.js";
import { MarketItem } from "#/models/marketItem.js";
import { Notice } from "obsidian";
import { Search } from "#/components/uikit/Search/index.ts";
import { Form } from "#/components/uikit/Form/index.ts";
import { appendLine, editLine } from "#/helpers/files.js";
import { findChoices } from "#/helpers/find.js";
import { dataview } from "#/helpers/plugins.js";
import { app } from "#/helpers/app.js";

// { history: [{name, tag, date}] of bought items, open: Set of lowercased names still on the list }
function marketState(dv) {
  const tasks = dv.page(MARKET)?.file.tasks.array() ?? [];

  return {
    history: tasks.filter(t => t.completed && t.completion)
      .map(t => {
        const i = MarketItem.of(t);

        return { name: i.name, tag: i.tag, date: ymd(t.completion) };
      }),
    open: new Set(tasks.filter(t => !t.completed).map(t => MarketItem.of(t).name.toLowerCase())),
  };
}

export async function loadCelestialMarket({ dv }) {
  const page = dv.page(MARKET);

  if (!page) return { missing: true, path: MARKET };
  const mkt = marketState(dv);
  const tasks = page.file.tasks.where(t => !t.completed).array();
  // a row: its line (to find it again) and its name (shown, and to check it's the same item)
  const row = t => ({ line: t.line, name: MarketItem.of(t).name });
  const n = tasks.length;

  return {
    empty: !n,
    left: `${n} item${n === 1 ? "" : "s"} left`,
    groups: marketCats
      .map(cat => ({ label: cat.label, rows: tasks.filter(t => catOf(t) === cat.tag).map(row) }))
      .filter(g => g.rows.length),
    soon: supplyStats(mkt.history, todayYmd()).filter(s => s.due && !mkt.open.has(s.name))
      .map(s => s.name).join(", "),
  };
}

export async function loadSupplies({ dv }) {
  const { history, open } = marketState(dv);
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
      .map(cat => ({ label: cat.label, rows: stats.filter(s => groupOf(s) === cat.tag).map(row) }))
      .filter(g => g.rows.length),
  };
}

const catLabel = tag => marketCats.find(c => c.tag === tag)?.label ?? tag;

export async function addMarketItem() {
  const { history, open } = marketState(dataview());
  const choices = marketChoices(history, open);
  // a category header over the first row of each category
  const find = q => findChoices(choices, q)
    .map((c, i, all) => ({ ...c, header: !c.isNew && c.tag !== all[i - 1]?.tag }));
  const pick = await Search.pick(app, "Find or add an item…", find, (c, el) => {
    if (c.header) el.createDiv({ cls: "winx-search__group", text: catLabel(c.tag) });
    const row = el.createDiv({ cls: "winx-search__row winx-row winx-between winx-gap-l" });
    row.createSpan({ text: c.isNew ? `+ new: ${c.name}` : c.name });
    const note = c.isNew ? "" : c.onList ? "on the list" : `×${c.buys} · ${dm(c.last)}`;
    row.createSpan({ cls: "winx-search__note winx-nowrap", text: note });
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

const addToMarket = (name, tag) => appendLine(MARKET, `- [ ] ${name} ${tag}`);

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
