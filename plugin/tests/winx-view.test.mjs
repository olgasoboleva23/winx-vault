import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Keymap } from "obsidian";
import { setApp } from "#/helpers/app.js";

// Vue page lifetimes, Obsidian history and opening a separate tab.
let WinxView, made, unloaded, vue, openWinx, OldWinxView;

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
  ({ openWinx, OldWinxView } = await import("#/components/app/open.ts"));
  vue = await import("vue");
  for (const key of ["dashboard", "calendar", "projects"]) {
    const Page = (await import(`../src/components/pages/${key}/index.vue`)).default;
    Page.setup = () => {
      made.push(key);
      vue.onUnmounted(() => unloaded.push(key));
      return () => vue.h("div", { class: "winx-view__page" }, key);
    };
  }

});

beforeEach(() => { made = []; unloaded = []; });

// a leaf as Obsidian's: setViewState opens nothing new, it gives the view the state (and keeps
// the result: a history step or not); getLeaf("tab") is another such leaf, its calls noted
function open() {
  const opened = [], pinned = [], saves = [];
  const workspace = {
    on: () => ({}), trigger() {}, requestSaveLayout: () => saves.push(1),
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
  return { view, leaf, opened, pinned, saves, ready: view.onOpen() };
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
  const shown = [...view.contentEl.querySelectorAll(".winx-view__page")].map(e => e.isShown());
  assert.deepEqual(shown, [true]);
  assert.equal(view.contentEl.querySelector(".winx-view__page").textContent, "calendar");
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

test("opening a project is a history step; ← list too", async () => {
  const { view, leaf, ready } = open();

  await ready;
  await leaf.setViewState({ state: {} });
  await view.go("projects");
  await view.go("projects", { open: "p1" });
  await view.go("projects", { open: null });
  assert.deepEqual(leaf.results.map(r => r.history), [undefined, true, true, true]);
  assert.equal(view.state.projects.open, null);
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

test("closing while the initial state is being restored leaves the tab unmounted", async () => {
  const { view, ready } = open();
  await ready;
  const restoring = view.setState({ page: "calendar" }, {});
  await view.onClose();
  await restoring;
  assert.deepEqual(made, []);
  assert.equal(view.contentEl.childElementCount, 0);
});

test("two Winx tabs keep their own state: one's dashboard date isn't the other's", async () => {
  const a = open(), b = open();

  await a.ready;
  await b.ready;
  await a.leaf.setViewState({ state: { dashboard: { date: "2026-11-10" } } });
  assert.equal(a.view.state.dashboard.date, "2026-11-10");
  assert.equal(b.view.state.dashboard.date, null);
});

test("the calendar's state is saved with the layout: unfolded days are, area isn't", async () => {
  const { view, leaf, saves, ready } = open();

  await ready;
  await leaf.setViewState({ state: { page: "calendar", calendar: {
    view: "month", tab: "pool", showDone: true, unfolded: ["2026-11-04", "bad"],
    date: "2026-12-09",
  } } });
  assert.deepEqual(view.getState().calendar, { date: "2026-12-09", view: "month",
    showDone: true, tab: "pool", unfolded: ["2026-11-04"], unfoldedDay: null,
    backlogOpen: false });
  await vue.nextTick();
  const before = saves.length;
  view.state.calendar.area = "body";
  view.state.calendar.picked = "2026-11-06";
  await vue.nextTick();
  assert.equal(saves.length, before);
  view.state.calendar.unfolded = [...view.state.calendar.unfolded, "2026-11-05"];
  await vue.nextTick();
  assert.equal(saves.length, before + 1);
});

test("an old calendar leaf becomes a Winx tab on the calendar, with its state", async () => {
  const got = [];
  const leaf = { app: {}, setViewState: async s => got.push(s) };
  const old = new OldWinxView(leaf, "winx-calendar", "calendar");

  leaf.view = old;
  assert.equal(old.getViewType(), "winx-calendar");
  await old.setState({ view: "month" }, {});
  await new Promise(r => setTimeout(r));   // after Obsidian's setViewState is done with it
  assert.deepEqual(got, [
    // popstate: the old view this replaces is no Back step
    { type: "winx", state: { page: "calendar", calendar: { view: "month" } }, popstate: true },
  ]);
});

test("an old leaf closed before its move does not come back as a Winx tab", async () => {
  const got = [];
  const leaf = { app: {}, setViewState: async s => got.push(s) };
  const old = new OldWinxView(leaf, "winx-calendar", "calendar");

  leaf.view = old;
  await old.setState({}, {});
  await old.onClose();
  await new Promise(r => setTimeout(r));
  assert.deepEqual(got, []);
});

// the workspace openWinx sees: its Winx leaves, the leaves it makes, what it reveals
function workspace(leaves) {
  const made = [], revealed = [];
  const leaf = () => {
    const l = {
      pinned: false, state: null, states: [], went: [],
      setPinned(p) { this.pinned = p; },
      async setViewState(s) { this.state = s; this.states.push(s); },
    };
    l.view = Object.assign(Object.create(WinxView.prototype), { go: (...a) => l.went.push(a) });
    return l;
  };
  for (const l of leaves) Object.assign(l, leaf(), l);
  setApp({ workspace: {
    getLeavesOfType: t => (t === "winx" ? leaves : []),
    getLeaf: () => { const l = leaf(); made.push(l); return l; },
    revealLeaf: async l => { revealed.push(l); },
  } });
  return { made, revealed };
}

test("openWinx: the newest Winx tab, else one new pinned tab", async () => {
  const old = { activeTime: 1 }, recent = { activeTime: 5 };
  let w = workspace([old, recent]);

  assert.equal(await openWinx("calendar"), recent);
  assert.deepEqual(w.made, []);
  assert.deepEqual(w.revealed, [recent]);
  assert.deepEqual(recent.went, [["calendar", {}]]);

  w = workspace([]);
  const leaf = await openWinx();
  assert.deepEqual(w.made, [leaf]);
  assert.equal(leaf.pinned, true);
  assert.equal(leaf.state.type, "winx");
  assert.deepEqual(leaf.went, []);

  // a page on a fresh tab: built in one call, so there is no dashboard step to go Back to
  w = workspace([]);
  const fresh = await openWinx("calendar", { view: "month" });
  assert.deepEqual(fresh.states, [{
    type: "winx", active: true, state: { page: "calendar", calendar: { view: "month" } },
  }]);
  assert.deepEqual(fresh.went, []);

  w = workspace([recent]);
  const extra = await openWinx("calendar", {}, true);
  assert.deepEqual(w.made, [extra]);
  assert.equal(extra.pinned, false);
});

test("the drawer: Projects, Finance, Shop, Supplies, Food, then ⚙ Settings; ↗ opens a tab", async () => {
  const { mount } = await import("@vue/test-utils");
  const PageNavigation = (await import("#/components/app/PageNavigation/index.vue")).default;
  const w = workspace([]);
  const went = [];
  const shell = mount(PageNavigation, { global: { provide: { winx: {
    state: { page: "dashboard" }, go: async (...a) => { went.push(a); },
  } } } });

  assert.equal(shell.find(".winx-drawer").exists(), false);
  await shell.findAll(".winx-btn--rail").at(-1).trigger("click");
  const rows = shell.findAll(".winx-page-navigation__row .winx-grow");

  assert.deepEqual(rows.map(r => r.findAll("span").at(-1).text()),
    ["Projects", "Finance", "Shop", "Supplies", "Food", "Settings"]);
  assert.match(rows[5].text(), /⚙/);
  await shell.find(".winx-page-navigation__open-tab").trigger("click");
  await new Promise(r => setTimeout(r));
  assert.equal(w.made.length, 1);
  assert.equal(w.made[0].pinned, false);
  assert.equal(w.made[0].state.state.page, "projects");

  await rows[0].trigger("click");
  assert.deepEqual(went.map(a => a[0]), ["projects"]);
  assert.equal(shell.find(".winx-drawer").exists(), false);
});


test("Finance route loads its ledger into the Vue page; closing removes its subscriptions", async () => {
  const { vault } = await import("./stubs/vault.mjs");
  const { app } = vault();
  const listeners = new Set();
  const on = (_name, fn) => { listeners.add(fn); return { off: () => listeners.delete(fn) }; };
  Object.assign(app.vault, { on });
  Object.assign(app.metadataCache, { on });
  app.vault.adapter.list = async () => ({ files: [] });
  const { view, leaf, ready } = open();
  app.workspace = leaf.app.workspace;
  app.workspace.on = on;
  await ready;
  await leaf.setViewState({ state: { page: "finance" } });
  await new Promise(r => setTimeout(r));
  assert.match(view.contentEl.querySelector(".winx-fin__empty").textContent, /The ledger is empty/);
  assert.equal(view.contentEl.querySelector("h2").textContent, "Finance");
  assert.ok(listeners.size > 0);
  await view.onClose();
  assert.equal(listeners.size, 0);
});

test("dashboard links select Vue pages even when their old notes do not exist", async () => {
  const { mount } = await import("@vue/test-utils");
  const Finance = (await import("#/components/pages/dashboard/widgets/finance/index.vue")).default;
  const Market = (await import("#/components/pages/dashboard/widgets/market/index.vue")).default;
  const went = [], notes = [];
  setApp({ metadataCache: { getFirstLinkpathDest: () => null }, workspace: {
    getActiveViewOfType: () => null, openLinkText: (...args) => notes.push(args),
  } });
  for (const [Component, data, label, page] of [
    [Finance, { empty: true }, "open finance", "finance"],
    [Market, { empty: true, groups: [] }, "supplies", "supplies"],
  ]) {
    const w = mount(Component, { props: { state: { data } }, global: {
      provide: { winx: { go: (...args) => went.push(args) } },
    } });
    const button = w.findAll("button").find(b => b.text().includes(label));
    await button.trigger("click");
    await button.trigger("click", { mod: true });
    assert.deepEqual(went.splice(0).map(([p, params, e]) => [p, params, !!e.mod]),
      [[page, {}, false], [page, {}, true]]);
    w.unmount();
  }
  assert.deepEqual(notes, []);
});

test("a standalone Finance widget opens its Vue page, Cmd-click in another tab", async () => {
  const { mount } = await import("@vue/test-utils");
  const Finance = (await import("#/components/pages/dashboard/widgets/finance/index.vue")).default;
  const recent = { activeTime: 1 }, w = workspace([recent]);
  const widget = mount(Finance, { props: { state: { data: { empty: true } } } });
  await widget.find("button").trigger("click");
  await widget.find("button").trigger("click", { mod: true });
  await new Promise(r => setTimeout(r));
  assert.deepEqual(recent.went, [["finance", {}]]);
  assert.equal(w.made[0].state.state.page, "finance");
  assert.equal(w.made[0].pinned, false);
  widget.unmount();
});
