import { test, before, mock } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { createRequire } from "node:module";
import { setApp } from "#/helpers/app.js";
import { idTask } from "./stubs/idTask.mjs";

// The calendar tab on Vue: its state through Obsidian's layout, a tick's 2 s, the folds, the panel's tab
const require = createRequire(import.meta.url);
const TODAY = "2026-11-04";   // a Wednesday
let vue, Tab, data, actions, state, CalendarView, useLater, dragState, Component, saves = 0;
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
  Tab = (await import("#/components/pages/calendar/CalendarTab/index.vue")).default;
  data = await import("#/models/calendarData.js");
  actions = await import("#/controllers/calendar.js");
  state = await import("#/store/calendar.js");
  ({ CalendarView } = await import("#/components/pages/calendar/view.ts"));
  ({ useLater } = await import("#/composables/use.js"));
  ({ dragState } = await import("#/composables/drag.js"));
  ({ Component } = await import("obsidian"));
});

let n = 0;
// the store's tasks, from a readable spec (idTask)
const task = (status, spec) => ({ status, ...idTask(spec), path: "00 System/Data/Tasks/Master.md", line: n++ });
const TASKS = () => { n = 0; return [
  task(" ", "#area/body walk [due:: 2026-11-04]"),
  task(" ", "#area/body #time/morning stretch [repeat:: every day] [due:: 2026-11-04]"),
  task(" ", "#area/base plan trip"),
  task(" ", "#area/mind read [repeat:: every week on Friday] [due:: 2026-11-06]"),
  task(" ", "#area/mind write [due:: 2026-11-04]"),
]; };
// the tab's Vue app on made-up data; `ticked`, `placed`, `moved`, `unplanned` collect what the writes get
function mount(over = {}) {
  const { reactive, markRaw, createApp } = vue;
  const st = reactive({ ...state.readState(undefined), area: null, picked: null, ...over });
  const days = state.shownDays(st, TODAY), ticked = [], placed = [], moved = [], unplanned = [];
  const ctx = markRaw({
    state: st, today: TODAY, days, base: state.baseDate(st, TODAY), view: st.view,
    shown: { open: true, ghost: true, done: st.showDone }, everything: null, TASKS: {}, infos: new Map(),
    model: new data.CalendarData({ tasks: TASKS(), poolLines: [], days, today: TODAY }),
    config: { areas: [{ tag: "#area/body", label: "🌺 Body" }], areaIcons: {}, areaMap: {} },
  });
  const text = data.T;
  ctx.actions = { ...actions.makeActions(ctx), tick: t => ticked.push(t),
    place: (t, day, done) => placed.push([text(t).text, day, done]), unplan: t => unplanned.push(text(t).text),
    reorder: (t, to, after) => moved.push([text(t).text, text(to).text, after]) };
  const tab = new Component();   // the tab: owns the ticks waiting their 2 s

  tab.load();
  const view = { state: st, ctx, actions: ctx.actions, waits: useLater(tab), drag: dragState(), info: t => data.taskInfo(t, ctx, { metadataCache:
    { getFirstLinkpathDest: () => null }, vault: {} }), task: k => data.findTask(k, ctx.model.all) };
  const el = document.body.appendChild(document.createElement("div"));
  createApp(Tab).provide("calendar", view).mount(el);
  return { el, st, ticked, placed, moved, unplanned, tab };
}
const box = (el, text) => [...el.querySelectorAll(".winx-cal__task--open")].find(r => r.textContent.includes(text))
  .querySelector("input");

test("its state goes into Obsidian's layout and comes back; area and the phone's day aren't saved", async () => {
  const v = new CalendarView({ app: { workspace: { requestSaveLayout: () => saves++ } } });
  await v.setState({ view: "month", tab: "pool", showDone: true, unfolded: ["2026-11-04", "bad"], date: "2026-12-09" }, {});
  assert.deepEqual(v.getState(), { date: "2026-12-09", view: "month", showDone: true, tab: "pool",
    unfolded: ["2026-11-04"], unfoldedDay: null, backlogOpen: false });
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
    const stretch = el.querySelector(".winx-cal__routine-list .winx-cal__task--open input");
    stretch.checked = true; stretch.dispatchEvent(new Event("change"));
    mock.timers.tick(1500);
    stretch.checked = false; stretch.dispatchEvent(new Event("change"));
    mock.timers.tick(3000);
    assert.equal(ticked.length, 1);
  } finally { mock.timers.reset(); }
});

test("a tick waiting its 2 s outlives the row, not the tab: closed meanwhile, nothing is written", async () => {
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { el, ticked, tab } = mount();
    const walk = box(el, "walk");

    walk.checked = true; walk.dispatchEvent(new Event("change"));
    tab.unload();   // the tab closed (or the plugin off) within the 2 s
    mock.timers.tick(3000);
    assert.equal(ticked.length, 0);
  } finally { mock.timers.reset(); }
});

test("the unfolded days are the day's: a click on a new day starts from none", async () => {
  const { el, st } = mount({ unfolded: ["2026-11-03"], unfoldedDay: "2026-11-03" });   // yesterday's
  el.querySelector(".winx-cal__routine-pill span").click();
  await vue.nextTick();
  assert.deepEqual(st.unfolded, [TODAY]);
  assert.equal(st.unfoldedDay, TODAY);
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

// drag and drop, swipes: the events as the browser sends them (dragstart on a row, dragover / drop
// on a zone, touches on a row)
const fire = (el, type, init = {}) =>
  el.dispatchEvent(Object.assign(new Event(type, { bubbles: true, cancelable: true }), init));
const row = (el, text) => [...el.querySelectorAll(".winx-cal__task--open")].find(r => r.textContent.includes(text));
const card = (el, text) => [...el.querySelectorAll(".winx-task-card")].find(r => r.textContent.includes(text));
const touch = (el, type, x, y) => fire(el, type, { touches: [{ clientX: x, clientY: y }] });
const swipe = (el, dx) => {
  touch(el, "touchstart", 100, 100);
  touch(el, "touchmove", 100 + dx / 2, 100);
  touch(el, "touchmove", 100 + dx, 100);
  fire(el, "touchend");
};

test("a row dragged onto a day's 📅 zone is planned there, onto a past day's ✓ zone: done that day, onto the panel: no date", async () => {
  const { el, placed } = mount();
  const walk = row(el, "walk"), days = [...el.querySelectorAll(".winx-cal__day")];
  fire(walk, "dragstart");
  await new Promise(r => setTimeout(r));   // the zones show a tick later (drag.js)
  assert.ok(el.querySelector(".winx-cal").classList.contains("winx-cal--dragging"));
  assert.ok(days[2].classList.contains("winx-cal__day--source"));   // its own day
  const plan = days[3].querySelector(".winx-cal__zone--plan");
  fire(plan, "dragover");
  await vue.nextTick();
  assert.ok(plan.classList.contains("winx-cal__zone--over"));
  fire(plan, "drop");
  await vue.nextTick();
  assert.deepEqual(placed, [["walk", "2026-11-05", false]]);
  assert.ok(!plan.classList.contains("winx-cal__zone--over"));
  fire(walk, "dragend");
  await vue.nextTick();
  assert.ok(!el.querySelector(".winx-cal--dragging"));
  assert.ok(!days[2].classList.contains("winx-cal__day--source"));
  fire(walk, "dragstart");
  fire(days[1].querySelector(".winx-cal__zone--done"), "drop");
  fire(walk, "dragend");
  fire(walk, "dragstart");
  fire(el.querySelector(".winx-cal__backlog"), "drop");
  assert.deepEqual(placed.slice(1), [["walk", "2026-11-03", true], ["walk", null, false]]);
});

test("dropped onto another open task of its day and group: before or after it, by the half it's over", async () => {
  const { el, moved } = mount();
  const walk = row(el, "walk"), write = row(el, "write"), stretch = row(el, "stretch");
  fire(walk, "dragstart");
  fire(write, "dragover", { clientY: 1 });   // the rect is 0×0 here: 1 is below its middle
  await vue.nextTick();
  assert.ok(write.classList.contains("winx-cal__task--drop-after"));
  fire(write, "dragover", { clientY: -1 });
  await vue.nextTick();
  assert.ok(write.classList.contains("winx-cal__task--drop-before"));
  fire(write, "drop", { clientY: -1 });
  await vue.nextTick();
  assert.deepEqual(moved, [["walk", "write", false]]);
  assert.ok(!write.classList.contains("winx-cal__task--drop-before"));
  fire(walk, "dragstart");
  fire(stretch, "dragover", { clientY: 1 });   // a 🔁 row: not its group
  await vue.nextTick();
  assert.ok(!stretch.classList.contains("winx-cal__task--drop-after"));
});

test("on the phone, a row swiped right is done (a day's row: its checkbox; a card: ticked at once), left: its date off", async () => {
  document.body.classList.add("is-mobile");
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { el, ticked, unplanned } = mount();
    const walk = row(el, "walk");
    touch(walk, "touchstart", 100, 100);
    touch(walk, "touchmove", 160, 100);
    await vue.nextTick();
    assert.equal(walk.dataset.swipe, "done");
    assert.equal(walk.style.getPropertyValue("--winx-swipe"), "60px");
    fire(walk, "touchend");
    await vue.nextTick();
    assert.equal(walk.dataset.swipe, undefined);
    assert.equal(ticked.length, 0);   // 60 px: too short
    swipe(walk, 100);
    await vue.nextTick();
    assert.ok(walk.querySelector("input").checked);
    mock.timers.tick(2000);
    assert.deepEqual(ticked.map(t => data.T(t).text), ["walk"]);
    swipe(card(el, "plan trip"), 100);
    assert.deepEqual(ticked.map(t => data.T(t).text), ["walk", "plan trip"]);
    await vue.nextTick();
    assert.equal(card(el, "plan trip"), undefined);   // gone at once
    swipe(row(el, "write"), -100);
    assert.deepEqual(unplanned, ["write"]);
    touch(walk, "touchstart", 100, 100);   // mostly down: a scroll, not a swipe
    touch(walk, "touchmove", 200, 300);
    fire(walk, "touchend");
    assert.equal(ticked.length, 2);
  } finally { mock.timers.reset(); document.body.classList.remove("is-mobile"); }
});
