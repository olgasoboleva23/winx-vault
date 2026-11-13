import { test, before, mock } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { createRequire } from "node:module";
import { setApp } from "#/helpers/app.js";
import { idTask } from "./stubs/idTask.mjs";

// The calendar page on Vue: a tick's 2 s, the folds, the panel's tab
const require = createRequire(import.meta.url);
const TODAY = "2026-11-04";   // a Wednesday
let vue, Tab, data, actions, state, useLater, dragState, Component;
before(async () => {
  GlobalRegistrator.register();
  window.moment = require("moment");
  window.AudioContext = class { decodeAudioData() { return Promise.resolve(null); } };
  HTMLElement.prototype.isShown = () => true;
  setApp({
    metadataCache: { getFirstLinkpathDest: n => ({ path: n }), on: () => ({}) },
    vault: { getResourcePath: f => f.path, on: () => ({}), adapter: { readBinary: async () => null } },
    workspace: { on: () => ({}), requestSaveLayout() {} },
    loadLocalStorage: () => null, saveLocalStorage() {}, commands: { executeCommandById() {} },
  });
  vue = await import("vue");
  Tab = (await import("#/components/pages/calendar/CalendarTab/index.vue")).default;
  data = await import("#/models/calendarData.js");
  actions = await import("#/controllers/calendar.js");
  state = await import("#/store/calendar.js");
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
function mount(over = {}, tasksApi = {}, source = { tasks: TASKS(), poolLines: [] }) {
  const { reactive, markRaw, createApp } = vue;
  const st = reactive({ ...state.readState(undefined), area: null, picked: null, ...over });
  const days = state.shownDays(st, TODAY), ticked = [], placed = [], moved = [], unplanned = [];
  const ctx = markRaw({
    state: st, today: TODAY, days, base: state.baseDate(st, TODAY), view: st.view,
    shown: { open: true, ghost: true, done: st.showDone }, everything: null, TASKS: tasksApi, infos: new Map(),
    model: new data.CalendarData({ ...source, days, today: TODAY }),
    config: { areas: [{ key: "body", label: "🌺 Body", icon: "🌺", color: "#e8609a" }], areaIcons: {}, areaMap: {}, areaColors: {} },
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
  return { el, st, ticked, placed, moved, unplanned, tab, view };
}
const box = (el, text) => [...el.querySelectorAll(".winx-cal__task--open")].find(r => r.textContent.includes(text))
  .querySelector("input");

test("CalendarPage: cached while hidden, refreshed on return; subscriptions end on close", async () => {
  const Calendar = (await import("#/components/pages/calendar/index.vue")).default;
  const { taskStore } = await import("#/store/tasks.js");
  const { mount } = await import("@vue/test-utils");
  const shown = vue.ref(true);
  const st = vue.reactive({ ...state.readState(undefined), area: null, picked: null });
  const Root = { setup: () => () => vue.h(vue.KeepAlive, null, {
    default: () => shown.value ? vue.h(Calendar, { state: st }) : null,
  }) };
  const wrapper = mount(Root, { attachTo: document.body });
  const view = wrapper.findComponent(Tab).vm.$.provides.calendar;
  const first = view.ctx;
  shown.value = false; await vue.nextTick();
  taskStore.version.value++; await vue.nextTick();
  assert.equal(view.ctx, first);
  shown.value = true; await vue.nextTick();
  assert.notEqual(view.ctx, first);
  const last = view.ctx;
  wrapper.unmount();
  taskStore.version.value++; await vue.nextTick();
  assert.equal(view.ctx, last);
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
  assert.match(el.querySelector(".winx-tabs__tab--on").textContent, /^Regulars/);
  assert.match(el.querySelector(".winx-cal__backlog-grid").textContent, /stretch/);
});

test("the area filter: a piece of the balance bar picks its area, again: all", async () => {
  const { el, st } = mount();
  el.querySelector(".winx-cal__area").click();
  assert.equal(st.area, "body");
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

test("phone: a short left swipe opens actions; a long one arms completion, moving back disarms", async () => {
  document.body.classList.add("is-mobile");
  mock.timers.enable({ apis: ["setTimeout"] });
  try {
    const { el, ticked, unplanned } = mount();
    const walk = row(el, "walk");
    swipe(walk, -60);
    await vue.nextTick();
    assert.equal(walk.dataset.swipe, "open");
    assert.equal(ticked.length, 0);
    assert.equal(unplanned.length, 0);
    assert.ok(walk.querySelector('[aria-label="remove date"]'));
    touch(walk, "touchstart", 240, 100);
    touch(walk, "touchmove", 60, 100);
    await vue.nextTick();
    assert.equal(walk.dataset.swipe, "ready");
    touch(walk, "touchmove", 180, 100);
    fire(walk, "touchend");
    await vue.nextTick();
    assert.equal(walk.dataset.swipe, "open");
    assert.equal(walk.querySelector("input").checked, false);
    swipe(walk, 60);
    await vue.nextTick();
    assert.equal(walk.dataset.swipe, undefined);
    swipe(walk, -180);
    await vue.nextTick();
    assert.ok(walk.querySelector("input").checked);
    mock.timers.tick(1999);
    assert.equal(ticked.length, 0);
    mock.timers.tick(1);
    assert.deepEqual(ticked.map(t => data.T(t).text), ["walk"]);
    swipe(card(el, "plan trip"), -180);
    await vue.nextTick();
    assert.deepEqual(ticked.map(t => data.T(t).text), ["walk", "plan trip"]);
    assert.equal(card(el, "plan trip"), undefined);
    const write = row(el, "write");
    swipe(write, -60);
    await vue.nextTick();
    write.querySelector('[aria-label="remove date"]').click();
    assert.deepEqual(unplanned, ["write"]);
  } finally { mock.timers.reset(); document.body.classList.remove("is-mobile"); }
});

test("phone: cancellation restores open actions; vertical scrolling and a drag never complete a task", async () => {
  document.body.classList.add("is-mobile");
  try {
    const { el, ticked } = mount();
    const plan = card(el, "plan trip");
    for (const opened of [false, true]) {
      if (opened) swipe(plan, -60);
      touch(plan, "touchstart", 240, 100);
      touch(plan, "touchmove", 40, 100);
      fire(plan, "touchcancel");
      await vue.nextTick();
      assert.equal(plan.dataset.swipe, opened ? "open" : undefined);
      assert.equal(ticked.length, 0);
    }
    swipe(plan, 60);
    touch(plan, "touchstart", 240, 100);
    touch(plan, "touchmove", 230, 140);
    touch(plan, "touchmove", 40, 150);
    fire(plan, "touchend");
    await vue.nextTick();
    assert.equal(plan.dataset.swipe, undefined);
    touch(plan, "touchstart", 240, 100);
    fire(plan, "dragstart");
    touch(plan, "touchmove", 40, 100);
    fire(plan, "touchend");
    fire(plan, "dragend");
    assert.equal(ticked.length, 0);
  } finally { document.body.classList.remove("is-mobile"); }
});

test("phone: primary button completes a card; without Tasks, swiping cannot complete it", async () => {
  document.body.classList.add("is-mobile");
  try {
    const { el, ticked } = mount();
    const plan = card(el, "plan trip");
    swipe(plan, -60);
    await vue.nextTick();
    plan.querySelector('[aria-label="complete task"]').click();
    assert.equal(ticked.length, 1);
    const disabled = mount({}, null);
    swipe(card(disabled.el, "plan trip"), -180);
    assert.equal(disabled.ticked.length, 0);
  } finally { document.body.classList.remove("is-mobile"); }
});

test("phone: pool swipes add an open copy today; Missed swipes complete on the task's own day", async () => {
  document.body.classList.add("is-mobile");
  try {
    const { el, view, ticked } = mount({ tab: "pool" }, {}, {
      tasks: [task(" ", "late chore [due:: 2026-11-02]")],
      poolLines: [{ id: "t900", rec: { name: "pool chore" }, path: "Pool.md" }],
    });
    const added = [], completed = [], today = [];
    view.actions.fromPool = (t, day, done) => added.push([data.T(t).text, day, done]);
    view.actions.doneOnItsDay = t => completed.push([data.T(t).text, data.T(t).date]);
    view.actions.toToday = t => today.push(data.T(t).text);
    const pool = card(el, "pool chore");
    swipe(pool, -60);
    await vue.nextTick();
    assert.equal(pool.dataset.swipe, "open");
    assert.equal(pool.querySelectorAll('[aria-label="add to today"]').length, 1);
    swipe(pool, -180);
    assert.deepEqual(added, [["pool chore", TODAY, false]]);
    assert.equal(ticked.length, 0);
    const missed = el.querySelector(".winx-missed__row");
    swipe(missed, -60);
    await vue.nextTick();
    assert.equal(missed.dataset.swipe, "open");
    assert.ok(missed.querySelector('[aria-label="move to today"]'));
    swipe(missed, -180);
    assert.deepEqual(completed, [["late chore", "2026-11-02"]]);
    assert.deepEqual(today, []);
  } finally { document.body.classList.remove("is-mobile"); }
});

test("Projects tab: a GroupCard per project with open tasks (a Done one too), a stage title over them, finished tasks hidden", async () => {
  const { taskStore } = await import("#/store/tasks.js");
  const { MASTER } = await import("#/helpers/paths.js");
  taskStore.put(MASTER, [
    "- [ ] t1 [due:: 2026-11-10]", "- [x] t2 [completion:: 2026-11-01]", "- [ ] t3", "- [ ] t4",
  ].join("\n"));
  taskStore.putRecords({ t1: { name: "pick venue" }, t2: { name: "book flights" },
    t3: { name: "pack bags" }, t4: { name: "old chore" } });
  taskStore.putProjects({
    trip: { name: "Trip", status: "active", stages: [{ name: "Plan", tasks: ["t1", "t2"] },
      { name: "Go", tasks: ["t3"] }, { name: "Back", tasks: ["t2"] }] },
    old: { name: "Old", status: "done", stages: [{ name: "All", tasks: ["t4"] }] },
    fin: { name: "Fin", status: "done", stages: [{ name: "All", tasks: ["t2"] }] },
  });
  const { el, st } = mount({ tab: "projects" });
  const panel = el.querySelector(".winx-cal__backlog-grid");
  assert.deepEqual([...panel.querySelectorAll(".winx-cal__group")].map(g => g.textContent), ["Trip", "Old"]);
  assert.deepEqual([...panel.querySelectorAll(".winx-cal__stage")].map(g => g.textContent), ["Plan", "Go", "All"]);
  assert.match(panel.textContent, /pick venue/);
  assert.match(panel.textContent, /pack bags/);
  assert.match(panel.textContent, /old chore/);
  assert.doesNotMatch(panel.textContent, /book flights/);
  assert.match(el.querySelector(".winx-tabs__tab--on").textContent, /^Projects · 3$/);
  assert.equal(st.tab, "projects");
  taskStore.put(MASTER, ""); taskStore.putRecords({}); taskStore.putProjects({});
});

test("Projects tab: no projects at first, then one with an open task shows its stage", async () => {
  const { taskStore } = await import("#/store/tasks.js");
  const { MASTER } = await import("#/helpers/paths.js");
  taskStore.putProjects({});
  const { el } = mount({ tab: "projects" });
  assert.equal(el.querySelector(".winx-cal__stage"), null);
  taskStore.put(MASTER, "- [ ] t1");
  taskStore.putRecords({ t1: { name: "pick venue" } });
  taskStore.putProjects({ trip: { name: "Trip", status: "active", stages: [{ name: "Plan", tasks: ["t1"] }] } });
  await vue.nextTick();
  assert.equal(el.querySelector(".winx-cal__stage").textContent, "Plan");
  taskStore.put(MASTER, ""); taskStore.putRecords({}); taskStore.putProjects({});
});

test("Projects tab: two stages with one name both show", async () => {
  const { taskStore } = await import("#/store/tasks.js");
  const { MASTER } = await import("#/helpers/paths.js");
  taskStore.put(MASTER, "- [ ] t1\n- [ ] t2");
  taskStore.putRecords({ t1: { name: "one" }, t2: { name: "two" } });
  taskStore.putProjects({ x: { name: "X", status: "active", stages: [{ name: "S", tasks: ["t1"] }, { name: "S", tasks: ["t2"] }] } });
  const { el } = mount({ tab: "projects" });
  assert.deepEqual([...el.querySelectorAll(".winx-cal__stage")].map(g => g.textContent), ["S", "S"]);
  taskStore.put(MASTER, ""); taskStore.putRecords({}); taskStore.putProjects({});
});
