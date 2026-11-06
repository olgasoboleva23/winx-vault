import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { BODY_LOG, WEIGHT } from "#/helpers/paths.js";

let mount, nextTick, WeightCard;
before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-05" });
  window.renderChart = async () => ({ destroy() {} });   // the Charts plugin
  ({ mount } = await import("@vue/test-utils"));
  ({ nextTick } = await import("vue"));
  WeightCard = (await import("#/components/pages/dashboard/widgets/body/WeightCard/index.vue")).default;
});

const data = {
  weight: { missing: false, last: { kg: 59.7, date: "2026-11-04" }, change: "-0.5", chart: null },
  log: { name: "Skin", reasons: ["🍰 sweets", "😴 sleep"], now: null, chart: null },
};

test("Weight: the last value and the change; typing a weight and Save logs it in Weight.md, the field clears", async () => {
  const { files } = vault({ [WEIGHT]: "- 2026-11-04 59.7\n" });
  const w = mount(WeightCard, { props: { state: { data } } });
  assert.equal(w.find(".winx-weight__now").text(), "59.7 kg");
  assert.equal(w.find(".winx-weight__delta").text(), "-0.5 vs week ago");
  await w.find("input").setValue("60.2");
  await w.find("form").trigger("submit");
  await nextTick(); await nextTick();
  assert.equal(files[WEIGHT], "- 2026-11-04 59.7\n- 2026-11-05 60.2\n");
  assert.equal(w.find("input").element.value, "");
});

test("Weight: the log mode, a level and a reason picked, saved with them in the body log", async () => {
  const { files } = vault({ [BODY_LOG]: "---\nname: Skin\n---\n" });
  const w = mount(WeightCard, { props: { state: { data } } });
  await w.findAll(".winx-weight__modes button")[1].trigger("click");
  const [levels, reasons] = w.findAll(".winx-weight__log-row");
  await levels.findAll("button")[2].trigger("click");
  await reasons.findAll("button")[1].trigger("click");
  assert.ok(levels.findAll("button")[2].classes().includes("winx-btn--on"));
  assert.equal(w.find(".winx-weight__log > .winx-btn--pill").text(), "Save today");
  await w.find(".winx-weight__log > .winx-btn--pill").trigger("click"); await nextTick();
  assert.equal(files[BODY_LOG], "---\nname: Skin\n---\n- 2026-11-05 2 😴 sleep\n");
});

test("Weight: the log's picks stay through a reload of the same data, follow it after a save and on a new day", async () => {
  const { reactive } = await import("vue");
  const entry = { date: "2026-11-05", level: 1, reasons: [] };
  const state = reactive({ data: { ...data, log: { ...data.log, day: "2026-11-05", now: { ...entry } } } });
  vault({ [BODY_LOG]: "" });
  const w = mount(WeightCard, { props: { state } });
  await w.findAll(".winx-weight__modes button")[1].trigger("click");
  const on = () => w.findAll(".winx-weight__log-row")[0].findAll("button").findIndex(b => b.classes().includes("winx-btn--on"));
  assert.equal(on(), 1);
  await w.findAll(".winx-weight__log-row")[0].findAll("button")[2].trigger("click");
  // a reload of the same file: new objects, same content — the pick stays
  state.data = { ...data, log: { ...data.log, day: "2026-11-05", now: { ...entry } } }; await nextTick();
  assert.equal(on(), 2);
  // saved, then the file has it: the picks follow the data again
  await w.find(".winx-weight__log > .winx-btn--pill").trigger("click");
  state.data = { ...data, log: { ...data.log, day: "2026-11-05", now: { ...entry, level: 3 } } }; await nextTick();
  assert.equal(on(), 3);
  // a new day: today's (empty) entry
  await w.findAll(".winx-weight__log-row")[0].findAll("button")[0].trigger("click");
  state.data = { ...data, log: { ...data.log, day: "2026-11-06", now: null } }; await nextTick();
  assert.equal(on(), -1);
});
