import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, h, defineComponent, ShopWidget, SuppliesWidget;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  ({ h, defineComponent } = await import("vue"));
  ShopWidget = (await import("#/components/pages/dashboard/widgets/shop/ShopWidget/index.vue")).default;
  SuppliesWidget = (await import("#/components/pages/dashboard/widgets/market/SuppliesWidget/index.vue")).default;
});
// the view inside a stand-in for its card's body
const inBody = (C, data, actions) =>
  mount(defineComponent({ render: () => h("div", { class: "body" }, [h(C, { state: { data }, actions })]) }));
const tick = () => new Promise(r => setTimeout(r));

test("Shop: the balance, an affordable reward bought with a click (then drawn again), the rest greyed out", async () => {
  const calls = [];
  const actions = { buy: async (name, cost) => (calls.push([name, cost]), true), retry: () => calls.push("retry") };
  const w = inBody(ShopWidget, { balance: 25, items: [
    { name: "Coffee", cost: 20, affordable: true }, { name: "Trip", cost: 500, affordable: false },
  ] }, actions);
  assert.equal(w.find(".winx-shop__balance-amount").text(), "25");
  const [coffee, trip] = w.findAll(".winx-shop__item");
  assert.equal(trip.attributes("disabled"), "");
  await coffee.trigger("click"); await tick();
  assert.deepEqual(calls, [["Coffee", 20], "retry"]);
});

test("Supplies: the rows by category, running low puts one back on the list; a listed one has no button", async () => {
  const calls = [];
  const w = inBody(SuppliesWidget, { empty: false, groups: [{ label: "🌿 Harvest", rows: [
    { name: "tea", tag: "#food", due: true, listed: false, info: "9 of ~7 days ⏳" },
    { name: "milk", tag: "#food", due: false, listed: true, info: "on the shopping list ✦" },
  ] }] }, { low: (...a) => calls.push(a) });
  assert.equal(w.find(".winx-group-header").text(), "🌿 Harvest");
  const [tea, milk] = w.findAll(".winx-supplies__row");
  assert.ok(tea.classes().includes("winx-supplies__row--due"));
  assert.equal(milk.find("button").exists(), false);
  await tea.find("button").trigger("click");
  assert.deepEqual(calls, [["tea", "#food"]]);
});
