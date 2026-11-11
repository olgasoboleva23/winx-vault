// Market's names and tags move to items.json; its lines keep their status and date syntax.
import { Notice } from "obsidian";
import { app } from "#/helpers/app.js";
import { MARKET, MARKET_RECORDS, MARKET_OLD } from "#/helpers/paths.js";
import { readJson } from "#/helpers/files.js";
import { catOf } from "#/models/market.js";
import { MarketItem } from "#/models/marketItem.js";
import { parseNote } from "#/models/taskFile.js";

const NOTE = `${MARKET}.md`;

export function migrateMarketText(text, existing = {}) {
  const records = structuredClone(existing), lines = text.split("\n");
  const names = new Map(Object.entries(records)
    .map(([id, r]) => [r.name.trim().toLowerCase(), id]));
  let number = Math.max(0, ...Object.keys(records).filter(id => /^m\d+$/.test(id))
    .map(id => +id.slice(1)));
  const latest = new Map();

  for (const t of parseNote(NOTE, text).filter(t => t.status !== null)) {
    const item = new MarketItem(lines[t.line]);

    if (item.id && records[item.id]) continue;
    if (item.id)
      throw new Error(`Market record ${item.id} is missing`);
    if (!item.name) continue;
    const key = item.name.trim().toLowerCase();
    let id = names.get(key);

    if (!id) names.set(key, id = `m${++number}`);
    // The most recent dated copy supplies the common name/category; ties keep the first.
    const date = [...item.line.matchAll(/\d{4}-\d{2}-\d{2}/g)].map(m => m[0]).sort().at(-1) ?? "";

    if (!existing[id] && (!latest.has(id) || date > latest.get(id))) {
      const tags = item.line.match(/#[^\s#]+/gu) ?? [];

      records[id] = { name: item.name, tag: catOf({ tags }), tags };
      latest.set(id, date);
    }

    // Keep all fields verbatim, including unfamiliar ones; names and tags live in the catalog.
    const suffix = item.line.match(/(?=\[\w+:: |[✅📅⏳🛫➕🔁❌]).*$/u)?.[0] ?? "";
    const prefix = item.line.match(/^\s*- \[.\]\s*/)[0];

    lines[t.line] = `${prefix}${id}${suffix ? ` ${suffix}` : ""}`;
  }

  return { log: lines.join("\n"), records };
}

// Explicit command only. Catalog first, log last under vault.process's content check. A failed
// last write can be retried; the original backup must still match the source being migrated.
export async function migrateMarket() {
  const { vault } = app, file = vault.getFileByPath(NOTE);

  if (!file) return void new Notice(`✦ ${NOTE} not found`);
  try {
    const text = await vault.read(file), existing = await readJson(MARKET_RECORDS, {});
    const { log, records } = migrateMarketText(text, existing);

    if (log === text && vault.getFileByPath(MARKET_RECORDS))
      return void new Notice("✦ market is already in ID format");
    const backup = vault.getFileByPath(MARKET_OLD);

    if (backup && await vault.read(backup) !== text)
      throw new Error("Market changed since its backup; reconcile the (old) copy before retrying");
    if (!backup) await vault.create(MARKET_OLD, text);
    const folder = MARKET_RECORDS.slice(0, MARKET_RECORDS.lastIndexOf("/"));

    if (!vault.getFolderByPath(folder)) await vault.createFolder(folder);
    const catalog = vault.getFileByPath(MARKET_RECORDS);
    const json = JSON.stringify(records, null, 2);

    if (catalog) await vault.process(catalog, current => {
      if (JSON.stringify(JSON.parse(current)) !== JSON.stringify(existing))
        throw new Error("Market catalog changed while migrating");
      return json;
    });
    else await vault.create(MARKET_RECORDS, json);
    await vault.process(file, current => {
      if (current !== text) throw new Error("Market log changed while migrating");
      return log;
    });
    new Notice(`✦ ${Object.keys(records).length} market items migrated`);
  } catch (e) {
    new Notice(`✦ migration stopped: ${e.message} — original log: ${MARKET_OLD}`);
  }
}
