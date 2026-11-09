import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { JOURNALS, WEIGHT } from "#/helpers/paths.js";

let mount, nextTick, WeightCard;
before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-05" });
  window.renderChart = async () => ({ destroy() {} });   // the Charts plugin
  ({ mount } = await import("@vue/test-utils"));
  ({ nextTick } = await import("vue"));
  WeightCard = (await import("#/components/pages/dashboard/widgets/weight/index.vue")).default;
});

const SKIN = `${JOURNALS}/Skin.md`, GUT = `${JOURNALS}/Gut.md`;
const data = {
  weight: { missing: false, last: { kg: 59.7, date: "2026-11-04" }, change: "-0.5", chart: null },
  logs: [
    { path: SKIN, name: "Skin", reasons: ["🍰 sweets", "😴 sleep"], day: "2026-11-05", now: null, chart: null },
    { path: GUT, name: "Gut", reasons: ["🥛 milk"], day: "2026-11-05", now: null, chart: null },
  ],
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

test("Weight: the journal's pill shows it, a select under it picks another; a level saves the day at once, a reason too", async () => {
  const { files, local } = vault({ [SKIN]: "---\nreasons: []\n---\n", [GUT]: "---\nreasons: []\n---\n" });
  const w = mount(WeightCard, { props: { state: { data } } });

  assert.equal(w.find("select.winx-weight__journal").exists(), false);   // weight shown: no select
  await w.findAll(".winx-weight__modes button")[1].trigger("click");
  const pill = w.find("select.winx-weight__journal");

  assert.deepEqual(pill.findAll("option").map(o => o.text()), ["Skin", "Gut"]);
  await pill.setValue(GUT); await nextTick();
  assert.equal(local["winx-journal"], GUT);   // this device remembers it
  const [levels, reasons] = w.findAll(".winx-weight__log-row");

  assert.deepEqual(reasons.findAll("button").map(b => b.text()), ["🥛 milk"]);
  await levels.findAll("button")[2].trigger("click"); await nextTick(); await nextTick();
  assert.equal(files[GUT], "---\nreasons: []\n---\n- 2026-11-05 2\n");
  await reasons.findAll("button")[0].trigger("click"); await nextTick(); await nextTick();
  assert.equal(files[GUT], "---\nreasons: []\n---\n- 2026-11-05 2 🥛 milk\n");
  assert.equal(w.find(".winx-weight__log > .winx-btn--pill").exists(), false);   // no Save today
  // a reason with no level yet: nothing written
  await w.find("select.winx-weight__journal").setValue(SKIN); await nextTick();
  await w.findAll(".winx-weight__log-row")[1].findAll("button")[0].trigger("click"); await nextTick();
  assert.equal(files[SKIN], "---\nreasons: []\n---\n");
});

test("Weight: ＋ after the journal's pill makes a new journal in its window and shows it", async () => {
  const { Form } = await import("#/components/uikit/Form/index.ts");
  const ask = Form.ask;
  const { files, local } = vault({ [SKIN]: "" });

  Form.ask = async () => ({ title: "Живот", reasons: "🥛 молоко", lag: 0 });
  const w = mount(WeightCard, { props: { state: { data } } });

  await w.find(".winx-weight__new").trigger("click"); await new Promise(r => setTimeout(r)); await nextTick();
  Form.ask = ask;
  assert.match(files[`${JOURNALS}/Живот.md`], /^---\ntype: journal\nlag: 0\nreasons:\n  - "🥛 молоко"\n---\n/);
  assert.equal(local["winx-journal"], `${JOURNALS}/Живот.md`);   // picked: shown once the card loads it
});

test("Weight: the log's picks follow the data: a new day starts empty", async () => {
  const { reactive } = await import("vue");
  const entry = { date: "2026-11-05", level: 1, reasons: [] };
  const log = now => ({ ...data.logs[0], now, day: now?.date ?? "2026-11-06" });
  const state = reactive({ data: { ...data, logs: [log({ ...entry })] } });

  vault({ [SKIN]: "" });
  const w = mount(WeightCard, { props: { state } });
  await w.findAll(".winx-weight__modes button")[1].trigger("click"); await nextTick();
  assert.equal(w.find("select.winx-weight__journal").exists(), false);   // one journal: no select
  const on = () => w.findAll(".winx-weight__log-row")[0].findAll("button").findIndex(b => b.classes().includes("winx-btn--on"));

  assert.equal(on(), 1);
  state.data = { ...data, logs: [log({ ...entry, level: 3 })] }; await nextTick();
  assert.equal(on(), 3);
  state.data = { ...data, logs: [log(null)] }; await nextTick();
  assert.equal(on(), -1);
});

test("loadWeight: every journal of the folder, by name, its reasons, lag and today's entry", async () => {
  const { loadWeight } = await import("#/controllers/widgets/weight.js");

  vault({ [SKIN]: "- 2026-11-05 2 🍰 sweets\n", [GUT]: "" }, { props: { [SKIN]: { reasons: ["🍰 sweets"], lag: 1 }, [GUT]: {} } });
  const { logs } = await loadWeight({ dv: { page: () => null }, app: (await import("#/helpers/app.js")).app });

  assert.deepEqual(logs.map(l => [l.name, l.path, l.lag, l.reasons]), [["Gut", GUT, 0, []], ["Skin", SKIN, 1, ["🍰 sweets"]]]);
  assert.deepEqual(logs[1].now, { date: "2026-11-05", level: 2, reasons: ["🍰 sweets"] });
});
