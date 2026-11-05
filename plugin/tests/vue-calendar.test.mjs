import { test, before, mock } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { createRequire } from "node:module";
import { setApp } from "../src/core/app.js";

// The calendar tab on Vue: its state through Obsidian's layout, a tick's 2 s, the folds, the panel's tab
const require = createRequire(import.meta.url);
const TODAY = "2026-11-04";   // a Wednesday
let vue, Tab, data, actions, state, CalendarView, saves = 0;
before(async () => {
  GlobalRegistrator.register();
  window.moment = require("moment");
  window.AudioContext = class { decodeAudioData() { return Promise.resolve(null); } };
  HTMLElement.prototype.isShown = () => true;
  setApp({
    metadataCache: { getFirstLinkpathDest: n => ({ path: n }), on: () => ({}) },
    vault: { getResourcePath: f => f.path, on: () => ({}), adapter: { readBinary: async () => null } },
    workspace: { on: () => ({}), requestSaveLayout: () => saves++ },
    loadLocalStorage: () => null, saveLocalStorage() {}, commands: { executeCommandById() {} },
  });
  vue = await import("vue");
  Tab = (await import("../src/components/calendar/CalendarTab.vue")).default;
  data = await import("../src/calendar/data.js");
  actions = await import("../src/controllers/calendar.js");
  state = await import("../src/calendar/state.js");
  ({ CalendarView } = await import("../src/calendar/view.ts"));
});

let n = 0;
const task = (status, text) => ({ status, text, path: "00 System/Data/Tasks/Master.md", line: n++ });
const TASKS = () => { n = 0; return [
  task(" ", "#area/body walk 📅 2026-11-04"),
  task(" ", "#area/body #time/morning stretch 🔁 every day 📅 2026-11-04"),
  task(" ", "#area/base plan trip"),
  task(" ", "#area/mind read 🔁 every week on Friday 📅 2026-11-06"),
]; };
// the tab's Vue app on made-up data, with `ticked` collecting the tasks the tick action writes
function mount(over = {}) {
  const { reactive, markRaw, createApp } = vue;
  const st = reactive({ ...state.readState(undefined), area: null, picked: null, ...over });
  const days = state.shownDays(st, TODAY), ticked = [];
  const ctx = markRaw({
    state: st, today: TODAY, days, base: state.baseDate(st, TODAY), view: st.view,
    shown: { open: true, ghost: true, done: st.showDone }, everything: null, TASKS: {}, infos: new Map(),
    model: new data.CalendarData({ tasks: TASKS(), poolLines: [], days, today: TODAY }),
    config: { areas: [{ tag: "#area/body", label: "🌺 Body" }], areaIcons: {}, areaMap: {} },
  });
  ctx.actions = { ...actions.makeActions(ctx), tick: t => ticked.push(t) };
  const view = { state: st, ctx, actions: ctx.actions, info: t => data.taskInfo(t, ctx, { metadataCache:
    { getFirstLinkpathDest: () => null }, vault: {} }), task: k => data.findTask(k, ctx.model.all) };
  const el = document.body.appendChild(document.createElement("div"));
  createApp(Tab).provide("calendar", view).mount(el);
  return { el, st, ticked };
}
const box = (el, text) => [...el.querySelectorAll(".winx-cal__task--open")].find(r => r.textContent.includes(text))
  .querySelector("input[data-action=tick]");

test("its state goes into Obsidian's layout and comes back; area and the phone's day aren't saved", async () => {
  const v = new CalendarView({ app: { workspace: { requestSaveLayout: () => saves++ } } });
  await v.setState({ view: "month", tab: "pool", showDone: true, unfolded: ["2026-11-04", "bad"], date: "2026-12-09" }, {});
  assert.deepEqual(v.getState(), { date: "2026-12-09", view: "month", showDone: true, tab: "pool",
    unfolded: ["2026-11-04"], backlogOpen: false });
  await vue.nextTick();
  const before = saves;
  v.state.area = "#area/body"; v.state.picked = "2026-11-06";
  await vue.nextTick();
  assert.equal(saves, before);   // not saved
  v.state.unfolded = [...v.state.unfolded, "2026-11-05"];
  await vue.nextTick();
  assert.equal(saves, before + 1);
});

test("a tick is written 2 s later; unticked in time, nothing", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });   // happy-dom's window is globalThis: its timers too
  try {
    const { el, ticked } = mount();
    const walk = box(el, "walk");
    walk.checked = true; walk.dispatchEvent(new Event("change"));
    await vue.nextTick();
    assert.ok(walk.closest(".winx-cal__task").classList.contains("winx-cal__task--ticking"));
    mock.timers.tick(1999);
    assert.equal(ticked.length, 0);
    mock.timers.tick(1);
    assert.deepEqual(ticked.map(t => data.T(t).text), ["walk"]);
    const stretch = el.querySelector(".winx-cal__routine-list input[data-action=tick]");
    stretch.checked = true; stretch.dispatchEvent(new Event("change"));
    mock.timers.tick(1500);
    stretch.checked = false; stretch.dispatchEvent(new Event("change"));
    mock.timers.tick(3000);
    assert.equal(ticked.length, 1);
  } finally { mock.timers.reset(); }
});

test("a day's 🔁 box folds and unfolds by its edge (into the state), not by a task in it", async () => {
  const { el, st } = mount();
  const routine = el.querySelector(".winx-cal__routine");
  routine.querySelector(".winx-cal__routine-pill span").click();
  await vue.nextTick();
  assert.deepEqual(st.unfolded, [TODAY]);
  assert.ok(routine.classList.contains("winx-cal__routine--open"));
  routine.querySelector(".winx-cal__routine-list .winx-cal__task").click();
  assert.deepEqual(st.unfolded, [TODAY]);   // a task: no fold
  routine.querySelector(".winx-cal__routine-time").click();
  await vue.nextTick();
  assert.deepEqual(st.unfolded, []);
});

test("the panel's tab redraws only the panel: the header's elements stay the same ones", async () => {
  const { el, st } = mount();
  const top = el.querySelector(".winx-cal__top"), day = el.querySelector(".winx-cal__day");
  st.tab = "regulars";
  await vue.nextTick();
  assert.equal(el.querySelector(".winx-cal__top"), top);
  assert.equal(el.querySelector(".winx-cal__day"), day);
  assert.match(el.querySelector(".winx-cal__tab--on").textContent, /^Regulars/);
  assert.match(el.querySelector(".winx-cal__backlog-grid").textContent, /stretch/);
});

test("the area filter: a piece of the balance bar picks its area, again: all", async () => {
  const { el, st } = mount();
  el.querySelector(".winx-cal__area").click();
  assert.equal(st.area, "#area/body");
  el.querySelector(".winx-cal__area").click();
  assert.equal(st.area, null);
});
