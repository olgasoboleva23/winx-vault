// The Celestial Market's controller (00 System/Data/Celestial Market.md) and the Supplies'. The
// list by category with a round ✓ per item, what runs low soon; Supplies: what is bought again and
// again, how long since the last time against the usual gap. Writes: an item on the list (＋: a
// search of everything bought before, the most bought first, or a new one typed), an item bought
// (✓), an item running low back on the list. The markup: widgets/market/.
import { dm, todayYmd } from "#/helpers/dates.js";
import {
  MarketItem, catLabel, catOf, historyOf, marketCats, marketChoices, nextMarketId, openKeys,
  supplyStats,
} from "#/models/market.js";
import { Notice } from "obsidian";
import { Search } from "#/components/uikit/Search/index.ts";
import { Form } from "#/components/uikit/Form/index.ts";
import { appendLine, editJson, editLine, readJson, serial } from "#/helpers/files.js";
import { findChoices } from "#/helpers/find.js";
import { parseNote } from "#/models/taskFile.js";
import { app } from "#/helpers/app.js";
import { MARKET_NOTE, MARKET_RECORDS } from "#/helpers/paths.js";

// Read the log and catalog together, without waiting for Dataview's index. Missing records show
// their ID instead of another item.
async function marketState() {
  const file = app.vault.getFileByPath(MARKET_NOTE);
  const records = await readJson(MARKET_RECORDS, null);
  const text = file ? await app.vault.read(file) : "";
  const tasks = parseNote(MARKET_NOTE, text).filter(t => t.status !== null)
    .map(t => ({ ...t, rec: records?.[MarketItem.of(t).id] ?? null }));
  const items = tasks.map(MarketItem.of);

  return {
    missing: !file, records, tasks, items, history: historyOf(items), open: openKeys(items),
  };
}

// the categories with their rows, in order, the empty ones left out
const byCategory = (list, catOfOne, row) => marketCats
  .map(cat => ({ label: cat.label, rows: list.filter(x => catOfOne(x) === cat.tag).map(row) }))
  .filter(g => g.rows.length);

export async function loadCelestialMarket() {
  const mkt = await marketState();

  if (mkt.missing) return { missing: true, path: MARKET_NOTE };
  const items = mkt.items.filter(i => i.isOpen);
  // a row: its line (to find it again) and its name (shown, and to check it's the same item)
  const row = i => ({ line: i.src.line, id: i.id, name: i.name });
  const n = items.length;

  return {
    empty: !n,
    left: `${n} item${n === 1 ? "" : "s"} left`,
    groups: byCategory(items, i => i.category, row),
    soon: supplyStats(mkt.history, todayYmd()).filter(s => s.due && !mkt.open.has(s.id ?? s.name))
      .map(s => s.name).join(", "),
  };
}

export async function loadSupplies() {
  const { history, open } = await marketState();
  const stats = supplyStats(history, todayYmd());

  // a row: how long since the last time against the usual gap, or that it's on the list already
  const row = s => {
    const listed = open.has(s.id ?? s.name);
    const info = listed ? "on the shopping list ✦"
      : s.avg ? `${s.since} of ~${s.avg} days${s.due ? " ⏳" : ""}`
      : `bought ${s.buys} times`;

    return { id: s.id, name: s.name, tag: s.tag, due: s.due, listed, info };
  };

  return { empty: !stats.length, groups: byCategory(stats, s => catOf(s.tag), row) };
}

export async function addMarketItem() {
  const { history, open, records } = await marketState();
  const choices = marketChoices(history, open, records);
  const pick = await Search.pickGrouped(app, "Find or add an item…", q => findChoices(choices, q), {
    groupOf: c => c.tag,
    label: catLabel,
    note: c => c.onList ? "on the list" : c.buys ? `×${c.buys} · ${dm(c.last)}` : "not bought yet",
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

  if (tag) await addToMarket(pick.name, tag, pick.id);
}

// Serialize additions so two clicks cannot allocate the same ID or append two open copies.
const adding = serial();

export const addToMarket = (name, tag, id = null) => adding(() => addItem(name, tag, id));

// the first item of a new vault starts the catalog (its folder too)
async function addItem(name, tag, id) {
  const state = await marketState();

  await editJson(MARKET_RECORDS, records => {
    if (id && !records[id]) throw new Error(`Market record ${id} is missing`);
    id ??= Object.keys(records)
      .find(k => records[k].name.trim().toLowerCase() === name.trim().toLowerCase());
    if (!id) {
      id = nextMarketId([...Object.keys(records), ...state.items.map(i => i.id)]);
      records[id] = { name, tag };
    }

    return records;
  });
  const file = app.vault.getFileByPath(MARKET_NOTE);

  if (!file) return appendLine(MARKET_NOTE, `- [ ] ${id}`);
  await app.vault.process(file, text => {
    const listed = parseNote(MARKET_NOTE, text).map(MarketItem.of)
      .some(i => i.isOpen && i.id === id);

    return listed ? text : `${text.trimEnd()}\n- [ ] ${id}\n`;
  });
}

// a row as bought, if its line is still that item
export function buyMarketItem({ line, id, name }) {
  const same = l => {
    const item = new MarketItem(l);

    return item.isOpen && (id ? item.id === id : item.name === name);
  };

  return editLine(MARKET_NOTE, line, same, l => new MarketItem(l).bought(todayYmd()));
}

// runsLow(name, tag, id = null): back on the Celestial Market's list
export async function runsLow(name, tag, id = null) {
  await addToMarket(name, tag, id);
  new Notice(`✦ ${name} → Celestial Market`);
}
