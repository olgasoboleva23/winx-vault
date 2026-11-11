import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { MASTER, TASK_RECORDS } from "#/helpers/paths.js";

let mount, reactive, shallowReactive, nextTick, Regulars, CalendarData, taskInfo;
const DAY = "2026-11-13";
const records = {
  t1: { name: "Training", variants: ["Core", "Arms"], goal: "workout", difficulty: "medium", area: "body" },
};
const line = () => `- [ ] t1 [repeat:: every week on Monday, Wednesday, Friday when done] [due:: ${DAY}]`;

before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  ({ reactive, shallowReactive, nextTick } = await import("vue"));
  Regulars = (await import("#/components/pages/calendar/CalendarPanel/RegularsTab.vue")).default;
  ({ CalendarData, taskInfo } = await import("#/models/calendarData.js"));
});

function draw(active = "Core", recs = records, paused = false) {
  const info = vault();
  const config = { areaIcons: { body: "🌺" }, areaMap: { body: "Body" }, areaColors: {} };
  const context = (id, all, pause) => {
    const task = { status: " ", text: line().slice(6).replace(pause ? / \[due:: [^\]]+\]/ : /$^/, ""), rec: { ...all.t1, currVariant: id }, path: MASTER, line: 0 };
    return { today: DAY, TASKS: {}, config, infos: new Map(), records: new Map(Object.entries(all)),
      model: new CalendarData({ tasks: [task, { ...task, line: 1, status: "x", text: "t1 [completion:: 2026-11-09]" }], poolLines: [], days: [DAY], today: DAY }),
      actions: { canSkip: () => !pause } };
  };
  const view = shallowReactive({ ctx: context(active, recs, paused), drag: {},
    actions: {}, task: () => null,
    info(t) { return taskInfo(t, view.ctx, info.app); },
  });
  const w = mount(Regulars, { global: { provide: { calendar: view, flipped: reactive(new Set()) } } });
  return { w, update: (id, all = recs, pause = false) => { view.ctx = context(id, all, pause); } };
}

test("Regulars shows one task, its variants, the upcoming name and common history", async () => {
  const { w, update } = draw();
  assert.equal(w.findAll(".winx-task-card").length, 1);
  assert.match(w.find(".winx-task-card__text").text(), /Training/);
  assert.match(w.text(), /Core ↔ Arms/);
  assert.match(w.text(), /next: Core · 13.11/);
  assert.match(w.text(), /done 1×/);
  update("Arms"); await nextTick();
  assert.match(w.text(), /next: Arms · 13.11/);
  update("Arms", records, true); await nextTick();
  assert.match(w.text(), /next: Arms · ⏸ paused/);
  w.unmount();
});
