import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, View;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  View = (await import("#/components/pages/dashboard/widgets/market/CelestialMarket/index.vue")).default;
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

test("a bought item back on the list can be bought again; a write that fails lets go of the row", async () => {
  const { reactive, nextTick } = await import("vue");
  const state = reactive({ data });
  const bought = [];
  let answer = true;
  const w = mount(View, { props: { state, actions: { buy: async r => { bought.push(r.name); return answer; } } } });
  await w.findAll(".winx-market__item")[0].find("button").trigger("click");
  await new Promise(r => setTimeout(r, 700));
  // written: the list comes back without it, then with it again (unticked in the note)
  state.data = { ...data, groups: [{ label: "🌿 Harvest", rows: [{ line: 5, name: "rice" }] }] }; await nextTick();
  state.data = data; await nextTick();
  const tea = () => w.findAll(".winx-market__item")[0];
  assert.ok(!tea().classes().includes("winx-market__item--bought"));
  answer = false;   // this time the line moved meanwhile: nothing written
  await tea().find("button").trigger("click");
  await new Promise(r => setTimeout(r, 700)); await nextTick();
  assert.deepEqual(bought, ["green tea", "green tea"]);
  assert.ok(!tea().classes().includes("winx-market__item--bought"));   // free again
});
