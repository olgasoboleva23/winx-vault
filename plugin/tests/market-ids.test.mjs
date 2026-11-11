import { test } from "node:test";
import assert from "node:assert/strict";
import { migrateMarketText, migrateMarket } from "#/migrations/market.js";
import { MARKET, MARKET_RECORDS, MARKET_OLD } from "#/helpers/paths.js";
import { vault } from "./stubs/vault.mjs";
import { supplyStats } from "#/models/market.js";

const note = `${MARKET}.md`;
const old = "# List\n- [ ] Tea #food [created:: 2026-11-01]\n- [x] tea #food ✅ 2026-10-01\n- [x] Tea #food ✅ 2026-10-12\n- [-] Soap #home [cancelled:: 2026-11-02]\n```md\n- [ ] example #other\n```\n";

test("Market migration preserves lines, statuses, metadata and code examples", () => {
  const { log, records } = migrateMarketText(old);
  assert.equal(log.split("\n").length, old.split("\n").length);
  assert.deepEqual(log.match(/\d{4}-\d{2}-\d{2}/g), old.match(/\d{4}-\d{2}-\d{2}/g));
  assert.equal(log, old.replaceAll("Tea #food", "m1").replaceAll("tea #food", "m1").replace("Soap #home", "m2"));
  assert.equal(records.m1.name, "Tea");
  assert.equal(records.m1.tag, "#food");
  assert.equal(Object.keys(records).length, 2);
  assert.deepEqual(migrateMarketText(log, records), { log, records });
});

test("Market ids retain purchases after renaming and separate same-named records", () => {
  const history = [
    { id: "m1", name: "New name", tag: "#food", date: "2026-10-01" },
    { id: "m1", name: "New name", tag: "#food", date: "2026-10-11" },
    { id: "m2", name: "New name", tag: "#food", date: "2026-10-12" },
  ];
  const stats = supplyStats(history, "2026-11-01");
  assert.equal(stats.length, 1);
  assert.equal(stats[0].id, "m1");
  assert.equal(stats[0].buys, 2);
  assert.equal(stats[0].name, "New name");
});

test("Market migration backs up before replacing text and can resume after the catalog write", async () => {
  const { files, app } = vault({ [note]: old });
  const process = app.vault.process;
  app.vault.process = async () => { throw new Error("disk full"); };
  await migrateMarket();
  assert.equal(files[note], old);
  assert.equal(files[MARKET_OLD], old);
  assert.ok(files[MARKET_RECORDS]);
  app.vault.process = process;
  await migrateMarket();
  assert.equal(files[note], migrateMarketText(old).log);
  const saved = { ...files };
  await migrateMarket();
  assert.deepEqual(files, saved);
});

test("A half-migrated market: ＋ on a catalog item adds no second open line, and the migration finishes", async () => {
  const { files, app } = vault({ [note]: old });
  const process = app.vault.process;
  app.vault.process = async () => { throw new Error("disk full"); };
  await migrateMarket();
  app.vault.process = process;
  await addToMarket("Tea", "#food", "m1");
  assert.equal(files[note], old);
  await migrateMarket();
  assert.equal(files[note], migrateMarketText(old).log);
  assert.equal(files[MARKET_OLD], old);
});

test("Market migration refuses a concurrent log change without losing the new line", async () => {
  const { files, app } = vault({ [note]: old });
  const process = app.vault.process;
  app.vault.process = (f, fn) => {
    files[note] += "- [ ] Added elsewhere #food\n";
    return process(f, fn);
  };
  await migrateMarket();
  assert.equal(files[note], old + "- [ ] Added elsewhere #food\n");
  assert.equal(files[MARKET_OLD], old);
});

import { addToMarket, loadCelestialMarket, loadSupplies, buyMarketItem } from "#/controllers/widgets/market.js";

test("Market loaders resolve catalog names and Supplies history; additions serialize and deduplicate", async () => {
  globalThis.window = { moment: () => ({ format: () => "2026-11-11" }) };
  const log = "- [x] m1 ✅ 2026-10-01\n- [x] m1 ✅ 2026-10-11\n";
  const { files } = vault({ [note]: log, [MARKET_RECORDS]: JSON.stringify({ m1: { name: "Renamed", tag: "#food" } }) });
  let supplies = await loadSupplies();
  assert.equal(supplies.groups[0].rows[0].name, "Renamed");
  assert.equal(supplies.groups[0].rows[0].listed, false);
  await Promise.all([addToMarket("Old name", "#food", "m1"), addToMarket("Old name", "#food", "m1")]);
  assert.equal(files[note].match(/- \[ \] m1/g).length, 1);
  await Promise.all([addToMarket("Soap", "#home"), addToMarket("Bread", "#food")]);
  const catalog = JSON.parse(files[MARKET_RECORDS]);
  assert.deepEqual(Object.keys(catalog), ["m1", "m2", "m3"]);
  const market = await loadCelestialMarket();
  const item = market.groups.flatMap(g => g.rows).find(r => r.id === "m1");
  assert.equal(item.name, "Renamed");
  assert.equal(await buyMarketItem(item), true);
  assert.equal(files[note].split("\n")[item.line], "- [x] m1 ✅ 2026-11-11");
  supplies = await loadSupplies();
  assert.equal(supplies.groups[0].rows[0].info, "0 of ~21 days");
});

test("A moved market row never buys another item, corrupt catalogs are not overwritten", async () => {
  const { files } = vault({ [note]: "- [ ] m2\n", [MARKET_RECORDS]: "broken" });
  assert.equal(await buyMarketItem({ line: 0, id: "m1", name: "Tea" }), false);
  await assert.rejects(() => addToMarket("Tea", "#food"), SyntaxError);
  assert.equal(files[MARKET_RECORDS], "broken");
  assert.equal(files[note], "- [ ] m2\n");
});

test("Market migration retains the displayed category when an unrelated tag comes first", async () => {
  const text = "- [ ] Tea #brand #food";
  vault({ [note]: text });
  assert.equal((await loadCelestialMarket()).groups[0].label, "🌿 Harvest");
  const { records } = migrateMarketText(text);
  assert.equal(records.m1.tag, "#food");
  assert.deepEqual(records.m1.tags, ["#brand", "#food"]);
});
