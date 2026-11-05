import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { setApp } from "../src/helpers/app.js";

let mount, CycleWidget;
const store = {};
before(async () => {
  GlobalRegistrator.register();
  setApp({ loadLocalStorage: k => store[k] ?? null, saveLocalStorage: (k, v) => { store[k] = v; } });
  ({ mount } = await import("@vue/test-utils"));
  CycleWidget = (await import("../src/components/pages/dashboard/widgets/body/CycleWidget/index.vue")).default;
});

const data = {
  day: "2026-11-04", page: true, info: true, mark: { kind: "end", text: "ended yesterday" },
  head: { day: 3, period: true, phase: "period", title: "MP 1/4\n\nday 1–5 · period", next: "02.12", when: "in 28 d" },
  rows: [{ start: "2026-11-02", when: "02.11 – now", length: "3 d period · 3 d so far", pills: ["period", "period", "period"] }],
  charts: [{ title: "cycle", kind: "len", avg: "avg 29 d", line: 96, cols: [{ v: 28, height: 93 }, { v: 30, height: 100 }] }],
};

test("Cycle: folded shows the head and the buttons; a click on the head unfolds it (kept on this device)", async () => {
  const marks = [];
  const w = mount(CycleWidget, { props: { state: { data }, actions: { mark: (k, d) => marks.push([k, d]) } } });
  assert.ok(w.classes().includes("winx-cycle--folded"));
  assert.equal(w.find(".winx-cycle__day").text(), "day 3 · period");
  assert.equal(w.find(".winx-cycle__day").attributes("title"), "MP 1/4\n\nday 1–5 · period");
  assert.ok(!w.find(".winx-cycle__rows").exists());
  await w.find(".winx-cycle__head").trigger("click");
  assert.equal(store["winx-cycle-open"], "1");
  assert.equal(w.findAll(".winx-cycle__pill--period").length, 3);
  await w.findAll(".winx-cycle__tabs button")[1].trigger("click");
  assert.equal(w.find(".winx-cycle__chart-avg").text(), "avg 29 d");
  await w.find(".winx-cycle__btns button").trigger("click");
  assert.deepEqual(marks, [["end", "2026-11-04"]]);
});

test("Cycle: no note, no data", () => {
  const none = { day: "2026-11-04", page: false, info: false, mark: { kind: "start", text: "started today" }, rows: [] };
  const w = mount(CycleWidget, { props: { state: { data: none }, actions: {} } });
  assert.match(w.text(), /Create 00 System\/Data\/Cycle\.md/);
  const empty = mount(CycleWidget, { props: { state: { data: { ...none, page: true } }, actions: {} } });
  assert.match(empty.text(), /No data yet/);
});
