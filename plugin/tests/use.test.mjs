import { test } from "node:test";
import assert from "node:assert/strict";
import { useRedraw, useNewDay, useBusy, useDataviewChanges, useWhenIndexed, useTabDate, useNoteLinks } from "#/composables/use.js";
import { setApp } from "#/helpers/app.js";

// a component that keeps what it's given: DOM listeners by type, workspace / vault events by name, intervals
const component = () => {
  const dom = {}, events = {}, intervals = [];
  const on = name => (fn => ({ name, fn }));
  return {
    dom, events, intervals,
    app: { workspace: { on: (n, fn) => ({ n, fn }), opened: [], openLinkText(p, src, tab) { this.opened.push([p, tab]); } }, vault: { on: (n, fn) => ({ n, fn }) }, metadataCache: { on: (n, fn) => ({ n, fn }) } },
    registerDomEvent(el, type, fn) { dom[type] = fn; (el.listeners ??= {})[type] = fn; },
    register() {},
    registerEvent(ref) { (events[ref.n] ??= []).push(ref.fn); },
    registerInterval(id) { intervals.push(id); },
  };
};
// an element with a data-action, inside the root
const root = { contains: () => true };
const button = action => ({ dataset: { action }, matches: () => false, closest(sel) { return sel === "[data-action]" ? this : null; } });

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

test("useDataviewChanges: a re-indexed file it watches runs fn, another doesn't; the note option also listens to that note", () => {
  const c = component(), seen = [];
  useDataviewChanges(c, () => seen.push("tasks"), { watched: p => p.startsWith("Tasks/") });
  c.events["dataview:metadata-change"][0]("update", { path: "Notes/a.md" });
  c.events["dataview:metadata-change"][0]("update", { path: "Tasks/a.md" });
  assert.deepEqual(seen, ["tasks"]);
  const w = component(), drawn = [];
  useDataviewChanges(w, () => drawn.push(1), { note: "Home.md" });
  w.events["dataview:metadata-change"][0]("update", { path: "Any.md" });   // no watched: any file
  w.events.changed[0]({ path: "Other.md" });
  w.events.changed[0]({ path: "Home.md" });
  assert.equal(drawn.length, 2);
});

test("useWhenIndexed: now when Dataview's index is ready (or Dataview is off), else once it's built, one time", () => {
  const index = { initialized: false };
  setApp({ plugins: { plugins: { dataview: { api: { index } } } } });
  const c = component(); let n = 0;
  useWhenIndexed(c, () => n++);
  assert.equal(n, 0);
  c.events["dataview:index-ready"][0]();
  c.events["dataview:index-ready"][0]();   // built again: not again
  assert.equal(n, 1);
  index.initialized = true;
  useWhenIndexed(component(), () => n++);
  setApp({ plugins: { plugins: {} } });
  useWhenIndexed(component(), () => n++);
  assert.equal(n, 3);
});

test("useTabDate: the dashboard's date change reaches a block inside a dated tab only", () => {
  let dated = false; const el = { closest: () => dated ? {} : null }, c = component(); let n = 0;
  useTabDate(c, el, () => n++);
  c.events["winx:date"][0]();
  dated = true; c.events["winx:date"][0]();
  assert.equal(n, 1);
});

test("useNoteLinks: a [[link]] opens its note (Cmd/Ctrl: a new tab); other clicks pass", () => {
  const c = component(), el = {}; let stopped = 0;
  useNoteLinks(c, el, e => e.mod);
  const link = href => ({ closest: () => href && { dataset: { href } } });
  el.listeners.click({ target: link("Finance"), preventDefault: () => stopped++, mod: true });
  el.listeners.click({ target: link(null), preventDefault: () => stopped++ });
  assert.deepEqual(c.app.workspace.opened, [["Finance", true]]);
  assert.equal(stopped, 1);
});

test("redrawNotes: every open note's preview is rendered anew (after a Winx reload)", async () => {
  const { redrawNotes } = await import("#/helpers/plugins.js");
  const drawn = [];
  const leaf = name => ({ view: { previewMode: { rerender: full => drawn.push([name, full]) } } });

  setApp({ workspace: { getLeavesOfType: t => t === "markdown" ? [leaf("a"), { view: {} }, leaf("b")] : [] } });
  redrawNotes();
  assert.deepEqual(drawn, [["a", true], ["b", true]]);
});
