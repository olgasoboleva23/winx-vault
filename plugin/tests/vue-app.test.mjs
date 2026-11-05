import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let useVueApp, Component, defineComponent, h, onMounted, nextTick;
before(async () => {
  GlobalRegistrator.register();
  ({ useVueApp } = await import("../src/core/vueApp.ts"));
  ({ Component } = await import("obsidian"));
  ({ defineComponent, h, onMounted, nextTick } = await import("vue"));
});

const settle = async () => { for (let i = 0; i < 3; i++) await nextTick(); await new Promise(r => setTimeout(r)); };

test("a Vue app owned by an Obsidian component: mounted now, unmounted when the owner unloads", async () => {
  const owner = new Component(), el = document.createElement("div");
  owner.load();
  useVueApp(owner, el, defineComponent({ render: () => h("b", "hi") }));
  assert.equal(el.innerHTML, "<b>hi</b>");
  owner.unload();
  assert.equal(el.innerHTML, "");
});

test("an error anywhere in the app, an async one too (a chart that fails), reaches onError", async () => {
  const owner = new Component(), el = document.createElement("div"), errors = [];
  owner.load();
  const Chart = defineComponent({
    setup() { onMounted(async () => { await Promise.resolve(); throw new Error("no chart"); }); return () => h("i"); },
  });
  useVueApp(owner, el, Chart, { onError: e => errors.push(e.message) });
  await settle();
  assert.deepEqual(errors, ["no chart"]);
  owner.unload();
});

test("unmount() given back may run before the owner unloads, once", async () => {
  const owner = new Component(), el = document.createElement("div");
  owner.load();
  const { unmount } = useVueApp(owner, el, defineComponent({ render: () => h("b") }));
  unmount();
  assert.equal(el.innerHTML, "");
  owner.unload();   // no second unmount
});
