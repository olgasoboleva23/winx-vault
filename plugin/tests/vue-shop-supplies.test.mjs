import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { MARKET, PURCHASES, TASKS } from "#/helpers/paths.js";
import { Notice } from "obsidian";

let mount, h, defineComponent, ShopWidget, SuppliesWidget, taskStore;
before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-05" });
  ({ taskStore } = await import("#/store/tasks.js"));
  ({ mount } = await import("@vue/test-utils"));
  ({ h, defineComponent } = await import("vue"));
  ShopWidget = (await import("#/components/pages/shop/index.vue")).default;
  SuppliesWidget = (await import("#/components/pages/supplies/index.vue")).default;
});
// the view inside a stand-in for its card's body, the host's retry provided
const inBody = (C, data, retry = () => {}) =>
  mount(defineComponent({ render: () => h("div", { class: "body" }, [h(C, { state: { data } })]) }), { global: { provide: { retry } } });
const tick = () => new Promise(r => setTimeout(r));

test("Shop: the balance, an affordable reward bought with a click (a purchase line, then drawn again), the rest greyed out", async () => {
  const { files } = vault({ [`${PURCHASES}.md`]: "# Purchases\n\n- 2026-11-01 | Tea | 5\n" });
  taskStore.put(`${TASKS}/Master.md`, "- [x] a quest #⭐⭐⭐⭐epic [completion:: 2026-11-01]\n");
  let retried = 0;
  const w = inBody(ShopWidget, { balance: 25, items: [
    { name: "Coffee", cost: 20, affordable: true }, { name: "Trip", cost: 500, affordable: false },
  ] }, () => retried++);
  assert.equal(w.find(".winx-shop__balance-amount").text(), "25");
  const [coffee, trip] = w.findAll(".winx-shop__item");
  assert.equal(trip.attributes("disabled"), "");
  await coffee.trigger("click"); await tick(); await tick();
  assert.equal(files[`${PURCHASES}.md`], "# Purchases\n\n- 2026-11-01 | Tea | 5\n- 2026-11-05 | Coffee | 20\n");
  assert.equal(Notice.last, "✨ Bought Coffee for 20 gold");
  assert.equal(retried, 1);
  await coffee.trigger("click"); await tick(); await tick();   // 0 gold left: not again
  assert.equal(Notice.last, "✦ Not enough gold for Coffee");
  assert.equal(retried, 1);
});

test("Supplies: the rows by category, running low puts one back on the list; a listed one has no button", async () => {
  const { files } = vault({ [`${MARKET}.md`]: "- [ ] rice #food\n" });
  const w = inBody(SuppliesWidget, { empty: false, groups: [{ label: "🌿 Harvest", rows: [
    { name: "tea", tag: "#food", due: true, listed: false, info: "9 of ~7 days ⏳" },
    { name: "milk", tag: "#food", due: false, listed: true, info: "on the shopping list ✦" },
  ] }] });
  assert.equal(w.find(".winx-group-header").text(), "🌿 Harvest");
  const [tea, milk] = w.findAll(".winx-supplies__row");
  assert.ok(tea.classes().includes("winx-supplies__row--due"));
  assert.equal(milk.find("button").exists(), false);
  await tea.find("button").trigger("click"); await tick();
  assert.equal(files[`${MARKET}.md`], "- [ ] rice #food\n- [ ] tea #food\n");
  assert.equal(Notice.last, "✦ tea → Celestial Market");
});
