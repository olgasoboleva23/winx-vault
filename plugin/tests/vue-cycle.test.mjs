import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { CYCLE } from "#/helpers/paths.js";

let mount, CycleWidget;
// Dataview's array of Cycle.md's list items, as cycleLog reads it (map, where, array)
const da = a => Object.assign(a, { map: f => da(Array.prototype.map.call(a, f)), where: f => da(a.filter(f)), array: () => [...a] });
const dataview = { page: () => ({ file: { lists: da([{ text: "- start:: 2026-11-02" }]) }, period: 8 }) };
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  CycleWidget = (await import("#/components/pages/dashboard/widgets/cycle/index.vue")).default;
});

const data = {
  day: "2026-11-04", page: true, info: true, mark: { kind: "end", text: "ended yesterday" },
  head: { day: 3, period: true, phase: "period", title: "MP 1/4\n\nday 1–5 · period", next: "02.12", when: "in 28 d" },
  rows: [{ start: "2026-11-02", when: "02.11 – now", length: "3 d period · 3 d so far", pills: ["period", "period", "period"] }],
  charts: [{ title: "cycle", kind: "len", avg: "avg 29 d", line: 96, cols: [{ v: 28, height: 93 }, { v: 30, height: 100 }] }],
};

test("Cycle: folded shows the head and the buttons; a click on the head unfolds it (kept on this device); ended yesterday: written", async () => {
  const { files, local } = vault({ [CYCLE]: "period:: 8\n\n- start:: 2026-11-02\n" }, { dataview });
  const w = mount(CycleWidget, { props: { state: { data } } });
  assert.ok(w.classes().includes("winx-cycle--folded"));
  assert.equal(w.find(".winx-cycle__day").text(), "day 3 · period");
  assert.equal(w.find(".winx-cycle__day").attributes("title"), "MP 1/4\n\nday 1–5 · period");
  assert.ok(!w.find(".winx-cycle__rows").exists());
  await w.find(".winx-cycle__head").trigger("click");
  assert.equal(local["winx-cycle-open"], "1");
  assert.equal(w.findAll(".winx-cycle__pill--period").length, 3);
  await w.findAll(".winx-cycle__tabs button")[1].trigger("click");
  assert.equal(w.find(".winx-cycle__chart-avg").text(), "avg 29 d");
  await w.find(".winx-cycle__btns button").trigger("click");
  await new Promise(r => setTimeout(r));
  assert.equal(files[CYCLE], "period:: 8\n\n- start:: 2026-11-02\n- end:: 2026-11-03\n");
});

test("Cycle: no note, no data", () => {
  const none = { day: "2026-11-04", page: false, info: false, mark: { kind: "start", text: "started today" }, rows: [] };
  const w = mount(CycleWidget, { props: { state: { data: none } } });
  assert.match(w.text(), /Create 00 System\/Data\/Cycle\.md/);
  const empty = mount(CycleWidget, { props: { state: { data: { ...none, page: true } } } });
  assert.match(empty.text(), /No data yet/);
});
