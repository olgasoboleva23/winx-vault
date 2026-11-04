import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, View;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  View = (await import("../src/widgets/market/CelestialMarket.vue")).default;
});
const data = {
  empty: false, left: "2 items left", soon: "salt",
  groups: [{ label: "🌿 Harvest", rows: [{ line: 3, name: "green tea" }, { line: 5, name: "rice" }] }],
};

test("Celestial Market: items by group, what runs low, how many are left", () => {
  const text = mount(View, { props: { state: { data }, actions: {} } }).text();
  for (const s of ["🌿 Harvest", "green tea", "rice", "running low soon: salt", "2 items left"]) assert.match(text, new RegExp(s));
});

test("✓ sparkles the row at once and writes it as bought after the sparkle, once", async () => {
  const bought = [];
  const w = mount(View, { props: { state: { data }, actions: { buy: r => bought.push(r) } } });
  const tea = w.findAll(".winx-market__item")[0];
  await tea.find("button").trigger("click");
  await tea.find("button").trigger("click");
  assert.ok(tea.classes().includes("winx-market__item--bought"));
  assert.equal(bought.length, 0);
  await new Promise(r => setTimeout(r, 700));
  assert.deepEqual(bought, [{ line: 3, name: "green tea" }]);
});

test("Celestial Market's note missing: Create …", () => {
  const w = mount(View, { props: { state: { data: { missing: true, path: "x/Celestial Market.md" } }, actions: {} } });
  assert.equal(w.text(), "✦ Create x/Celestial Market.md");
});
