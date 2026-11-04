import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, nextTick, WeightCard;
before(async () => {
  GlobalRegistrator.register();
  window.renderChart = async () => ({ destroy() {} });   // the Charts plugin
  ({ mount } = await import("@vue/test-utils"));
  ({ nextTick } = await import("vue"));
  WeightCard = (await import("../src/components/widgets/body/WeightCard.vue")).default;
});

const data = {
  weight: { missing: false, last: { kg: 59.7, date: "2026-11-04" }, change: "-0.5", chart: null },
  log: { name: "Skin", reasons: ["🍰 sweets", "😴 sleep"], now: null, chart: null },
};

test("Weight: the last value and the change; typing a weight and Save logs it, the field clears", async () => {
  const logged = [];
  const w = mount(WeightCard, { props: { state: { data }, actions: { logWeight: async t => (logged.push(t), true) } } });
  assert.equal(w.find(".winx-weight__now").text(), "59.7 kg");
  assert.equal(w.find(".winx-weight__delta").text(), "-0.5 vs week ago");
  await w.find("input").setValue("60.2");
  await w.find("form").trigger("submit");
  await nextTick(); await nextTick();
  assert.deepEqual(logged.map(String), ["60.2"]);   // a number field: Vue may give the number itself
  assert.equal(w.find("input").element.value, "");
});

test("Weight: the log mode, a level and a reason picked, saved with them", async () => {
  const saved = [];
  const w = mount(WeightCard, { props: { state: { data }, actions: { logBody: (l, r) => saved.push([l, r]) } } });
  await w.findAll(".winx-weight__modes button")[1].trigger("click");
  const [levels, reasons] = w.findAll(".winx-weight__log-row");
  await levels.findAll("button")[2].trigger("click");
  await reasons.findAll("button")[1].trigger("click");
  assert.ok(levels.findAll("button")[2].classes().includes("winx-btn--on"));
  assert.equal(w.find(".winx-weight__log > .winx-btn--pill").text(), "Save today");
  await w.find(".winx-weight__log > .winx-btn--pill").trigger("click");
  assert.deepEqual(saved, [[2, ["😴 sleep"]]]);
});
