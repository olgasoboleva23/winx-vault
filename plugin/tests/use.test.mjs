import { test } from "node:test";
import assert from "node:assert/strict";
import { useActions, useRedraw, useNewDay, useBusy } from "../src/core/use.js";

// a component that keeps what it's given: DOM listeners by type, workspace / vault events by name, intervals
const component = () => {
  const dom = {}, events = {}, intervals = [];
  const on = name => (fn => ({ name, fn }));
  return {
    dom, events, intervals,
    app: { workspace: { on: (n, fn) => ({ n, fn }) }, vault: { on: (n, fn) => ({ n, fn }) } },
    registerDomEvent(el, type, fn) { dom[type] = fn; },
    registerEvent(ref) { (events[ref.n] ??= []).push(ref.fn); },
    registerInterval(id) { intervals.push(id); },
  };
};
// an element with a data-action, inside the root
const root = { contains: () => true };
const button = action => ({ dataset: { action }, matches: () => false, closest(sel) { return sel === "[data-action]" ? this : null; } });

test("useActions: a click on an element with data-action runs the handler find gives for its name", () => {
  const c = component(), btn = button("buy"), seen = [];
  useActions(c, root, (name, el) => name === "buy" ? (e, target) => seen.push([name, target === btn]) : null);
  c.dom.click({ type: "click", target: btn });
  c.dom.click({ type: "click", target: button("other") });   // no handler: nothing
  assert.deepEqual(seen, [["buy", true]]);
});

test("useActions: a form's submit runs its action and isn't sent", () => {
  const c = component(), form = { dataset: { action: "save" }, matches: s => s === "form" || s.includes("form"), closest(sel) { return sel === "[data-action]" ? this : null; } };
  let ran = false, prevented = false;
  useActions(c, root, () => () => { ran = true; }, ["submit"]);
  c.dom.submit({ type: "submit", target: form, preventDefault: () => { prevented = true; } });
  assert.ok(ran && prevented);
});

test("useRedraw: hidden, a redraw waits; shown, the next leaf or layout change draws it once", () => {
  const c = component(); let shown = false, draws = 0;
  const { redraw } = useRedraw(c, () => shown, () => draws++);
  redraw();
  assert.equal(draws, 0);
  shown = true;
  c.events["layout-change"][0]();
  c.events["active-leaf-change"][0]();   // already drawn: not again
  assert.equal(draws, 1);
});

test("useNewDay: the handler runs once when the date changes", () => {
  let day = "2026-11-01", tick = null;
  globalThis.window = { moment: () => ({ format: () => day }), setInterval: fn => { tick = fn; return 1; } };
  const c = component(), seen = [];
  useNewDay(c, d => seen.push(d));
  tick();
  day = "2026-11-02"; tick(); tick();
  assert.deepEqual(seen, ["2026-11-02"]);
});

test("useBusy: a write to a watched file adds the class, a write elsewhere doesn't", () => {
  const c = component(), el = { classList: new Set() };
  el.classList.add = el.classList.add.bind(el.classList);
  globalThis.window = { setTimeout: () => 0, clearTimeout: () => {} };
  useBusy(c, p => p.startsWith("Tasks/"), () => el, "x--busy");
  c.events.modify[0]({ path: "Notes/a.md" });
  assert.equal(el.classList.has("x--busy"), false);
  c.events.modify[0]({ path: "Tasks/a.md" });
  assert.equal(el.classList.has("x--busy"), true);
});
