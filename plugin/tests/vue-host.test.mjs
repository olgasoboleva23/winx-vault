import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { setApp } from "#/helpers/app.js";

let VueHost, defineComponent, h, nextTick;
// an app whose events the test fires: on(name, fn) → a ref; fire(name, …args)
const events = () => {
  const fns = {};
  const on = (name, fn) => { (fns[name] ??= new Set()).add(fn); return { off: () => fns[name].delete(fn) }; };
  return { on, fire: (name, ...args) => [...(fns[name] ?? [])].forEach(fn => fn(...args)) };
};
const bus = events();
before(async () => {
  GlobalRegistrator.register();
  // Obsidian's own: shown unless it or a parent is marked hidden here, or has no box (display: contents)
  HTMLElement.prototype.isShown = function () { return !this.closest("[data-hidden]") && this.style.display !== "contents"; };
  setApp({ workspace: bus, metadataCache: bus, plugins: { plugins: { dataview: { api: { index: { initialized: true } } } } } });
  ({ VueHost } = await import("#/composables/vueHost.ts"));
  ({ defineComponent, h, nextTick } = await import("vue"));
});

// a view that shows state.data.n (the host draws the error and the placeholder)
const View = () => defineComponent({
  props: { state: Object, actions: Object },
  setup: p => () => h("b", p.state.error ? `err ${p.state.error}` : p.state.data ? String(p.state.data.n) : "…"),
});
// a load the test lets go: loads[i].ok(data) / .fail(error)
const slow = () => {
  const loads = [];
  return { loads, load: () => new Promise((ok, fail) => loads.push({ ok, fail })) };
};
const mount = (opts, el = document.body.appendChild(document.createElement("div"))) => {
  const host = new VueHost(el, View(), opts);
  host.load();
  return { host, el };
};
const settle = async () => { for (let i = 0; i < 3; i++) await nextTick(); };

test("a load overtaken by a newer one doesn't put its old data in", async () => {
  const s = slow(), { host, el } = mount({ load: s.load });
  const second = host.refresh();
  s.loads[1].ok({ n: 2 }); await second;
  s.loads[0].ok({ n: 1 }); await settle();
  assert.equal(el.textContent, "2");
  host.unload();
});

test("a load that ends after the block went writes nothing, and Vue is unmounted", async () => {
  const s = slow(), { host, el } = mount({ load: s.load });
  host.unload();
  s.loads[0].ok({ n: 1 }); await settle();
  assert.equal(host.state.data, null);
  assert.equal(el.innerHTML, "");
});

test("an error shows with retry, which loads again", async () => {
  const s = slow(), { host, el } = mount({ load: s.load });
  const quiet = console.error; console.error = () => {};
  s.loads[0].fail(new Error("Weight.md is broken")); await settle();
  console.error = quiet;
  assert.equal(el.textContent, "⚠ couldn't draw: Weight.md is brokenretry");   // the host's own WinxFailed
  el.querySelector("button").click();
  s.loads[1].ok({ n: 3 }); await settle();
  assert.equal(el.textContent, "3");
  host.unload();
});

test("a Dataview change reloads it; a hidden block only once it shows", async () => {
  const s = slow(), { host, el } = mount({ load: s.load });
  s.loads[0].ok({ n: 1 }); await settle();
  el.dataset.hidden = "1";
  bus.fire("dataview:metadata-change", "update", { path: "x.md" });
  assert.equal(s.loads.length, 1);
  delete el.dataset.hidden;
  bus.fire("active-leaf-change");
  assert.equal(s.loads.length, 2);
  host.unload();
});

test("a card's block without a box of its own (display: contents) counts as shown", async () => {
  const el = document.body.appendChild(document.createElement("div"));
  el.style.display = "contents";
  const s = slow(), { host } = mount({ load: s.load }, el);
  s.loads[0].ok({ n: 1 }); await settle();
  bus.fire("dataview:metadata-change", "update", { path: "x.md" });
  assert.equal(s.loads.length, 2);
  host.unload();
});

test("a card: its placeholder until the first data, then the view inside it; winx-drawn once drawn", async () => {
  const s = slow(), el = document.body.appendChild(document.createElement("div"));
  let drawn = 0;
  el.addEventListener("winx-drawn", () => drawn++);
  const { host } = mount({ load: s.load, card: { title: "Weight" } }, el);
  await settle();
  assert.ok(el.querySelector(".winx-widget .winx-widget__body .winx-widget__skeleton"));
  s.loads[0].ok({ n: 4 }); await settle();
  assert.equal(el.querySelector(".winx-widget__body").textContent, "4");
  assert.equal(el.querySelector(".callout-title-inner").textContent, "Weight");
  assert.equal(drawn, 1);
  host.unload();
});

test("a view that takes no actions gets none (no actions attribute on its root)", async () => {
  const Bare = defineComponent({ props: { state: Object }, setup: p => () => h("b", p.state.data ? "ok" : "…") });
  const s = slow(), el = document.body.appendChild(document.createElement("div"));
  const host = new VueHost(el, Bare, { load: s.load, actions: { save: () => {} } });
  host.load();
  s.loads[0].ok({}); await settle();
  assert.equal(el.innerHTML, "<b>ok</b>");
  host.unload();
});

test("a card's button goes next to its title and gets the actions", async () => {
  let added = 0;
  const Plus = defineComponent({ props: { actions: Object }, setup: p => () => h("button", { onClick: p.actions.add }, "+") });
  const s = slow(), el = document.body.appendChild(document.createElement("div"));
  const host = new VueHost(el, View(), { load: s.load, card: { title: "Market" }, cardButton: Plus, actions: { add: () => added++ } });
  host.load(); await settle();
  el.querySelector(".callout-title-inner + button").click();
  assert.equal(added, 1);
  host.unload();
});

test("follows: false loads once: a Dataview change doesn't reload it", async () => {
  const s = slow(), { host } = mount({ load: s.load, follows: false });
  s.loads[0].ok({ n: 1 }); await settle();
  bus.fire("dataview:metadata-change", "update", { path: "x.md" });
  assert.equal(s.loads.length, 1);
  host.unload();
});

test("an error inside the view (a chart that fails to draw, async) shows the error with retry", async () => {
  const { onMounted } = await import("vue");
  const Broken = defineComponent({
    props: { state: Object },
    setup() { onMounted(async () => { await Promise.resolve(); throw new Error("no chart"); }); return () => h("i"); },
  });
  const s = slow(), el = document.body.appendChild(document.createElement("div"));
  const host = new VueHost(el, Broken, { load: s.load });
  const quiet = console.error; console.error = () => {};
  host.load();
  s.loads[0].ok({ n: 1 }); await settle(); await new Promise(r => setTimeout(r)); await settle();
  console.error = quiet;
  assert.equal(host.state.error, "no chart");
  assert.match(el.textContent, /couldn't draw: no chart/);
  host.unload();
});

test("watches: a widget reloads for a change in its own files only", async () => {
  const s = slow(), el = document.body.appendChild(document.createElement("div"));
  const host = new VueHost(el, View(), { load: s.load, watches: ["00 System/Data/Weight.md"] });
  host.load();
  s.loads[0].ok({ n: 1 }); await settle();
  bus.fire("dataview:metadata-change", "update", { path: "00 System/Data/Tasks/Master.md" });
  assert.equal(s.loads.length, 1);
  bus.fire("dataview:metadata-change", "update", { path: "00 System/Data/Weight.md" });
  assert.equal(s.loads.length, 2);
  host.unload();
});
