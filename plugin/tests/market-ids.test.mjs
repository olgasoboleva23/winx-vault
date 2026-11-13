import { addToMarket, loadCelestialMarket, loadSupplies, buyMarketItem } from "#/controllers/widgets/market.js";
import { test } from "node:test";
import assert from "node:assert/strict";
import { MARKET, MARKET_RECORDS } from "#/helpers/paths.js";
import { vault } from "./stubs/vault.mjs";
import { supplyStats } from "#/models/market.js";

const note = `${MARKET}.md`;

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
  assert.equal(files[note].split("\n")[item.line], "- [x] m1 [completion:: 2026-11-11]");
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

test("A new vault's first market item starts the catalog", async () => {
  const { files } = vault({});
  await addToMarket("Tea", "#food");
  assert.deepEqual(JSON.parse(files[MARKET_RECORDS]), { m1: { name: "Tea", tag: "#food" } }
);
  assert.equal(files[note], "- [ ] m1\n");
});
