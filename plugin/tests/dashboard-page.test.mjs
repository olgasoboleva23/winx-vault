import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { createRequire } from "node:module";
import { MarkdownRenderer } from "obsidian";
import { setApp } from "#/helpers/app.js";

// The dashboard's page: layout.md drawn for its date (the body's data-date), the date row moving it
const require = createRequire(import.meta.url);
let vue, DashboardPage, todayYmd;
const triggered = [];
before(async () => {
  GlobalRegistrator.register();
  window.moment = require("moment");
  // Obsidian's DOM helpers the page draws with
  Object.assign(HTMLElement.prototype, {
    addClasses(c) { this.classList.add(...c); },
    removeClass(c) { this.classList.remove(c); },
    empty() { this.replaceChildren(); },
    createDiv(o) { return this.createEl("div", o); },
    createSpan(o) { return this.createEl("span", o); },
    createEl(tag, { cls, text, attr = {} } = {}) {
      const e = this.appendChild(document.createElement(tag));
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);
      return e;
    },
  });
  setApp({
    vault: { on: () => ({}) },
    workspace: { on: () => ({}), trigger: name => triggered.push(name) },
  });
  vue = await import("vue");
  ({ DashboardPage } = await import("#/components/pages/dashboard/view.ts"));
  ({ todayYmd } = await import("#/helpers/dates.js"));
});

test("DashboardPage: the body carries the date; go(today) saves null and moves data-date", async () => {
  const state = vue.reactive({ date: "2026-11-10" });
  const el = document.body.appendChild(document.createElement("div"));
  const page = new DashboardPage(state, el);
  page.load();
  await new Promise(r => setTimeout(r));
  assert.ok(el.classList.contains("winx-dash"));
  assert.equal(el.querySelector("[data-date]").dataset.date, "2026-11-10");
  assert.ok(el.querySelector(".winx-dash__date input"));   // the date row drawn in its slot
  page.go(todayYmd());
  assert.equal(state.date, null);
  assert.equal(el.querySelector("[data-date]").dataset.date, todayYmd());
  assert.deepEqual(triggered, ["winx:date"]);
  page.unload();
});

test("DashboardPage: a date set from outside (Back / Forward) is drawn", async () => {
  const state = vue.reactive({ date: "2026-11-10" });
  const el = document.body.appendChild(document.createElement("div"));
  const page = new DashboardPage(state, el);

  page.load();
  await new Promise(r => setTimeout(r));
  state.date = "2026-11-05";
  await vue.nextTick();
  assert.equal(el.querySelector("[data-date]").dataset.date, "2026-11-05");
  page.unload();
});

test("DashboardPage: closing during Markdown rendering keeps its Vue apps unmounted", async t => {
  let finish;
  t.mock.method(MarkdownRenderer, "render", async (_app, _md, el) => {
    el.innerHTML = '<div class="winx-dash__date"></div>';
    await new Promise(resolve => { finish = resolve; });
  });
  const el = document.body.appendChild(document.createElement("div"));
  const page = new DashboardPage(vue.reactive({ date: null }), el);

  page.load();
  page.unload();
  finish();
  await new Promise(resolve => setTimeout(resolve));
  assert.equal(!!el.querySelector(".winx-dash__date").__vue_app__, false);
  assert.equal(!!el.querySelector("input"), false);
  el.remove();
});
