import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Component, Keymap } from "obsidian";

// The Winx tab: its pages made once and kept (hidden), its steps in Obsidian's history, Cmd-click
// a new tab. The pages here are stand-ins (pages.ts' make replaced), counted as they're made.
let WinxView, pages, made, unloaded;

before(async () => {
  GlobalRegistrator.register();
  // Obsidian's DOM helpers the tab uses
  Object.assign(HTMLElement.prototype, {
    addClass(c) { this.classList.add(c); },
    addClasses(c) { this.classList.add(...c); },
    empty() { this.replaceChildren(); },
    createDiv(o = {}) {
      const e = this.appendChild(document.createElement("div"));
      if (o.cls) e.className = o.cls;
      return e;
    },
    hide() { this.style.display = "none"; },
    show() { this.style.display = ""; },
    isShown() { return this.style.display !== "none"; },
  });
  ({ WinxView } = await import("#/components/app/view.ts"));
  ({ pages } = await import("#/components/app/pages.ts"));
  for (const key of Object.keys(pages)) {
    pages[key].make = () => {
      made.push(key);
      const page = new Component();
      page.onunload = () => unloaded.push(key);
      return page;
    };
  }
});

beforeEach(() => { made = []; unloaded = []; });

// a leaf as Obsidian's: setViewState opens nothing new, it gives the view the state (and keeps
// the result: a history step or not); getLeaf("tab") is another such leaf, its calls noted
function open() {
  const opened = [], pinned = [];
  const workspace = {
    on: () => ({}), trigger() {}, requestSaveLayout() {},
    getLeaf: type => ({
      setViewState: async s => opened.push([type, s]), setPinned: p => pinned.push(p),
    }),
  };
  const leaf = {
    app: { workspace },
    results: [],
    async setViewState(s) {
      const result = {};
      this.results.push(result);
      await view.setState(s.state, result);
    },
    updateHeader() {},
  };
  const view = new WinxView(leaf);

  view.load();
  return { view, leaf, opened, pinned, ready: view.onOpen() };
}

const keeps = "switching keeps the dashboard and calendar loaded and hidden; "
  + "the same page again is not remade";

test(keeps, async () => {
  const { view, leaf, ready } = open();

  await ready;
  await leaf.setViewState({ state: {} });
  await view.go("calendar");
  await view.go("dashboard");
  await view.go("calendar");
  assert.deepEqual(made, ["dashboard", "calendar"]);
  assert.deepEqual(unloaded, []);
  const shown = [...view.contentEl.querySelectorAll(".winx-app__page")].map(e => e.isShown());
  assert.deepEqual(shown, [false, true]);
  assert.equal(view.getDisplayText(), "Calendar");
});

test("setState on the shown calendar with another view keeps its page object", async () => {
  const { view, leaf, ready } = open();

  await ready;
  await leaf.setViewState({ state: { page: "calendar" } });
  const calendar = view.state.calendar;
  await leaf.setViewState({ state: { page: "calendar", calendar: { view: "month" } } });
  assert.equal(view.state.calendar, calendar);
  assert.equal(calendar.view, "month");
  assert.deepEqual(made, ["calendar"]);
});

test("a page step is a history step; a calendar week is not", async () => {
  const { view, leaf, ready } = open();

  await ready;
  await leaf.setViewState({ state: {} });
  await view.go("calendar");
  await view.go("calendar", { date: "2026-11-20" });
  assert.deepEqual(leaf.results.map(r => r.history), [undefined, true, false]);
});

test("Cmd-click opens a new, unpinned Winx tab with a copy", async () => {
  const { view, leaf, opened, pinned, ready } = open();

  await ready;
  await leaf.setViewState({ state: {} });
  const isMod = Keymap.isModEvent;
  Keymap.isModEvent = () => true;
  await view.go("calendar", {}, new MouseEvent("click", { metaKey: true }));
  Keymap.isModEvent = isMod;
  assert.equal(opened.length, 1);
  const [type, s] = opened[0];
  assert.equal(type, "tab");
  assert.equal(s.type, "winx");
  assert.equal(s.state.page, "calendar");
  assert.deepEqual(pinned, []);
  assert.equal(view.state.page, "dashboard");
});

test("closing the tab unloads every page, hidden ones too", async () => {
  const { view, leaf, ready } = open();

  await ready;
  await leaf.setViewState({ state: { page: "calendar" } });
  await view.go("dashboard");
  await view.onClose();
  assert.deepEqual(unloaded.sort(), ["calendar", "dashboard"]);
});

test("two Winx tabs keep their own state: one's dashboard date isn't the other's", async () => {
  const a = open(), b = open();

  await a.ready;
  await b.ready;
  await a.leaf.setViewState({ state: { dashboard: { date: "2026-11-10" } } });
  assert.equal(a.view.state.dashboard.date, "2026-11-10");
  assert.equal(b.view.state.dashboard.date, null);
});
