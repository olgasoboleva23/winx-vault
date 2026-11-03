import { test } from "node:test";
import assert from "node:assert/strict";
import { createStore } from "../src/core/store.js";
import { PartsLayout } from "../src/calendar/layout.js";

test("a store: set changes the state, saves when a saved key changed, calls the watchers of the changed keys once", () => {
  let saves = 0; const seen = [];
  const store = createStore({ date: null, tab: "nodate", picked: null }, { save: () => saves++, saved: ["date", "tab"] });
  store.watch(["date", "picked"], () => seen.push("grid"));
  store.watch(["tab"], () => seen.push("panel"));
  store.set({ date: "2026-11-10", picked: "2026-11-11" });
  assert.deepEqual(seen, ["grid"]);                  // one call for two of its keys
  store.set({ tab: "nodate" });                       // the same value: nothing
  store.set({ picked: "2026-11-12" });                // not a saved key: no save
  assert.deepEqual(seen, ["grid", "grid"]);
  assert.equal(saves, 1);
  store.set({ tab: "pool" });
  assert.deepEqual([store.state.tab, seen.at(-1), saves], ["pool", "panel", 2]);
});

// a root as a list of elements; a part's markup "a,b" → two elements
const root = () => ({ kids: [], insertBefore(e, next) { const i = next ? this.kids.indexOf(next) : -1; i < 0 ? this.kids.push(e) : this.kids.splice(i, 0, e); } });
const node = (r, name) => ({ name, remove() { r.kids.splice(r.kids.indexOf(this), 1); } });

test("parts in their order; one part redrawn in place, the others kept", () => {
  const r = root(); let n = 0;
  const parts = { header: { render: () => ({ html: "h" }) }, grid: { render: () => ({ html: `g${++n},g'` }) }, panel: { render: () => ({ html: "p" }) } };
  const layout = new PartsLayout(parts, html => html.split(",").map(x => node(r, x)));
  layout.mount(r);
  assert.deepEqual(r.kids.map(k => k.name), ["h", "g1", "g'", "p"]);
  const kept = r.kids[0];
  layout.redraw("grid");
  assert.deepEqual(r.kids.map(k => k.name), ["h", "g2", "g'", "p"]);
  assert.equal(r.kids[0], kept);
});
