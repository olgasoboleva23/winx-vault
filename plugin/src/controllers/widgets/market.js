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
import { appendLine, editLine, readJson } from "#/helpers/files.js";
import { findChoices } from "#/helpers/find.js";
import { parseNote } from "#/models/taskFile.js";
import { app } from "#/helpers/app.js";
import { MARKET, MARKET_RECORDS } from "#/helpers/paths.js";

const MARKET_NOTE = `${MARKET}.md`;

// Read the log and catalog together, without waiting for Dataview's index. Legacy lines remain
// readable until the explicit migration. Missing records show their ID instead of another item.
async function marketState() {
  const file = app.vault.getFileByPath(MARKET_NOTE);
  const records = await readJson(MARKET_RECORDS, null);
  const text = file ? await app.vault.read(file) : "";
  const tasks = parseNote(MARKET_NOTE, text).filter(t => t.status !== null)
    .map(t => ({ ...t, rec: records?.[MarketItem.of(t).id] ?? null }));
  const items = tasks.map(MarketItem.of);

  return { missing: !file, records, tasks, history: historyOf(items), open: openKeys(items) };
}

export async function loadCelestialMarket() {
  const mkt = await marketState();

  if (mkt.missing) return { missing: true, path: MARKET_NOTE };
  const tasks = mkt.tasks.filter(t => MarketItem.of(t).isOpen);
  // a row: its line (to find it again) and its name (shown, and to check it's the same item)
  const row = t => ({ line: t.line, id: MarketItem.of(t).id, name: MarketItem.of(t).name });
  const n = tasks.length;

  return {
    empty: !n,
    left: `${n} item${n === 1 ? "" : "s"} left`,
    groups: marketCats
      .map(cat => ({
        label: cat.label, rows: tasks.filter(t => MarketItem.of(t).category === cat.tag).map(row),
      }))
      .filter(g => g.rows.length),
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

  return {
    empty: !stats.length,
    groups: marketCats
      .map(cat => ({
        label: cat.label, rows: stats.filter(s => catOf(s.tag) === cat.tag).map(row),
      }))
      .filter(g => g.rows.length),
  };
}

export async function addMarketItem() {
  const { history, open, records } = await marketState();
  const choices = marketChoices(history, open, records ?? {});
  // a category header over the first row of each category
  const find = q => findChoices(choices, q)
    .map((c, i, all) => ({ ...c, header: !c.isNew && c.tag !== all[i - 1]?.tag }));
  const pick = await Search.pick(app, "Find or add an item…", find, (c, el) => {
    if (c.header) el.createDiv({ cls: "winx-search__group", text: catLabel(c.tag) });
    const row = el.createDiv({ cls: "winx-search__row winx-row winx-between winx-gap-l" });
    row.createSpan({ text: c.isNew ? `+ new: ${c.name}` : c.name });
    const note = c.isNew ? "" : c.onList ? "on the list"
      : c.buys ? `×${c.buys} · ${dm(c.last)}` : "not bought yet";
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

  if (tag) await addToMarket(pick.name, tag, pick.id);
}

// Serialize additions so two clicks cannot allocate the same ID or append two open copies.
let adding = Promise.resolve();

export function addToMarket(name, tag, id = null) {
  const run = adding.then(() => addItem(name, tag, id));

  adding = run.catch(() => {});
  return run;
}

async function addItem(name, tag, id) {
  const state = await marketState();

  if (!state.records) {
    if (id) throw new Error("Market catalog is missing");
    return appendLine(MARKET_NOTE, `- [ ] ${name} ${tag}`, { unique: true });
  }

  const catalog = app.vault.getFileByPath(MARKET_RECORDS);

  if (!catalog) throw new Error("Market catalog is missing");
  await app.vault.process(catalog, text => {
    const records = JSON.parse(text);

    if (id && !records[id]) throw new Error(`Market record ${id} is missing`);
    id ??= Object.keys(records)
      .find(k => records[k].name.trim().toLowerCase() === name.trim().toLowerCase());
    if (!id) {
      id = nextMarketId([...Object.keys(records), ...state.tasks.map(t => MarketItem.of(t).id)]);
      records[id] = { name, tag, tags: [tag] };
    }

    return JSON.stringify(records, null, 2);
  });
  const file = app.vault.getFileByPath(MARKET_NOTE);

  if (!file) return appendLine(MARKET_NOTE, `- [ ] ${id}`);
  // open already by its id, or by its name on a legacy line (a migration not finished)
  const key = name.trim().toLowerCase();

  await app.vault.process(file, text => {
    const listed = parseNote(MARKET_NOTE, text).map(MarketItem.of)
      .some(i => i.isOpen && (i.id === id || i.key === key));

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
