import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// each component draws the markup the styles expect (the components' index.scss): the same as the old uikit/*.js did,
// written out here; Vue's <!--v-if--> placeholders left out (no box, no style)
let mount, ui;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  // a component is <Name>.vue, or <Name>/index.vue when it has its own styles
  const load = async n => (await import(`../src/components/uikit/${n}`)).default;
  ui = Object.fromEntries(await Promise.all(["WinxButton", "WinxNoteLink", "WinxEmpty", "WinxMissing", "WinxFailed",
    "WinxGroupHeader", "WinxAddForm", "WinxCard", "WinxTable"].map(async n => {
    const styled = ["WinxButton", "WinxEmpty", "WinxAddForm", "WinxCard", "WinxTable"].includes(n);

    return [n, await load(styled ? `${n}/index.vue` : `${n}.vue`)];
  })));
});
const draws = (vue, html) => assert.equal(vue.element.outerHTML.replace(/<!--[^]*?-->/g, ""), html);

test("WinxButton: kinds, on, title, extra classes", () => {
  draws(mount(ui.WinxButton, { props: { title: "delete task" }, slots: { default: "🗑" } }),
    '<button class="winx-btn winx-btn--round" aria-label="delete task" data-tip="winx-tooltip">🗑</button>');
  // on a blue place (Missed, today): the pink tooltip
  draws(mount(ui.WinxButton, { props: { title: "move to today", tip: "pink" }, slots: { default: "☀️" } }),
    '<button class="winx-btn winx-btn--round" aria-label="move to today" data-tip="winx-tooltip winx-tooltip--pink">☀️</button>');
  draws(mount(ui.WinxButton, { props: { kind: "pill" }, attrs: { class: "winx-weight__list" }, slots: { default: "✦ list" } }),
    '<button class="winx-btn winx-btn--pill winx-weight__list">✦ list</button>');
  draws(mount(ui.WinxButton, { props: { kind: "toggle", on: true }, slots: { default: "✓ done" } }), '<button class="winx-btn winx-btn--toggle winx-btn--on">✓ done</button>');
  draws(mount(ui.WinxButton, { props: { kind: "toggle" }, slots: { default: "✓ done" } }), '<button class="winx-btn winx-btn--toggle">✓ done</button>');
});

test("WinxNoteLink, WinxEmpty, WinxMissing, WinxFailed, WinxGroupHeader, WinxAddForm, WinxCard", () => {
  draws(mount(ui.WinxNoteLink, { props: { path: "x/Cycle.md" }, slots: { default: "dates" } }), '<button class="winx-btn winx-btn--pill">dates</button>');
  draws(mount(ui.WinxEmpty, { props: { text: "All bought" } }), '<div class="winx-empty winx-text-center">✦ All bought</div>');
  draws(mount(ui.WinxEmpty), '<div class="winx-empty winx-text-center">✦ Nothing here yet</div>');
  draws(mount(ui.WinxMissing, { props: { path: "x/Goals.md" } }), '<div class="winx-empty winx-text-center">✦ Create x/Goals.md</div>');
  draws(mount(ui.WinxFailed, { props: { text: "Goals.md is broken" } }),
    '<div class="winx-empty winx-text-center winx-empty--error">⚠ couldn\'t draw: Goals.md is broken<button class="winx-btn winx-btn--chip winx-empty__retry">retry</button></div>');
  draws(mount(ui.WinxGroupHeader, { props: { label: "🌿 Harvest", count: 3 } }),
    '<div class="winx-group-header"><span>🌿 Harvest</span><span class="winx-group-header__count">3</span></div>');
  draws(mount(ui.WinxGroupHeader, { props: { label: "🌿 Harvest" } }), '<div class="winx-group-header"><span>🌿 Harvest</span></div>');
  const input = { name: "kg", type: "number", placeholder: "today, kg" };
  draws(mount(ui.WinxAddForm, { props: { input, submit: "Save" } }),
    '<form class="winx-add-form winx-flex winx-gap-s"><input class="winx-input winx-input--field winx-add-form__input" type="number" placeholder="today, kg" name="kg"><button class="winx-add-form__submit" type="submit">Save</button></form>');
  draws(mount(ui.WinxCard, { props: { title: "Weight", meta: ["scroll"] }, slots: { default: "<b>40 kg</b>" } }),
    '<div class="callout winx-widget" data-callout="card" data-callout-metadata="scroll" data-callout-fold=""><div class="callout-title winx-widget__title" dir="auto"><div class="callout-icon"></div><div class="callout-title-inner">Weight</div></div><div class="callout-content winx-widget__body"><b>40 kg</b></div></div>');
});

test("WinxButton: a mirrored nav chevron (next) gets its modifier", () => {
  const next = mount(ui.WinxButton, { props: { kind: "nav", mirrored: true, title: "next" }, slots: { default: "›" } });
  assert.equal(next.find("button").classes().join(" "), "winx-btn winx-btn--nav winx-btn--mirrored");
});

test("WinxCard puts a widget's own class on its body (the shop's winx-shop)", () => {
  const card = mount(ui.WinxCard, { props: { title: "Shop", bodyClass: "winx-shop" } });
  assert.equal(card.find(".winx-widget__body").classes().join(" "), "callout-content winx-widget__body winx-shop");
});

test("WinxFailed's retry and WinxAddForm's submit reach the parent", async () => {
  const failed = mount(ui.WinxFailed, { props: { text: "x" } });
  await failed.find("button").trigger("click");
  assert.equal(failed.emitted("retry").length, 1);
  const form = mount(ui.WinxAddForm, { props: { input: { name: "kg" } } });
  await form.find("input").setValue("60.2");
  await form.find("form").trigger("submit");
  assert.deepEqual(form.emitted("submit")[0], ["60.2"]);
});

test("WinxTable: the columns' heads and classes, a row per item named by row-class, a cell's text or the cell slot; a column's tip on its head", () => {
  const columns = [{ key: "name", label: "Код", class: "x-name", tip: "the medicine" }, { key: "n", label: "N", align: "center" }];
  const rows = [{ name: "АЕ", n: 1, when: "past" }, { name: "МА", n: 2, when: "today" }];
  const w = mount(ui.WinxTable, {
    props: { columns, rows, rowKey: r => r.name, rowClass: r => `x-${r.when}` },
    slots: { cell: `<template #cell="{ row, col }"><b v-if="col.key === 'n'">{{ row.n * 10 }}</b><template v-else>{{ row[col.key] }}</template></template>` },
  });

  draws(mount(ui.WinxTable, { props: { columns: [{ key: "a", label: "A" }], rows: [], bordered: true } }),
    '<table class="winx-table winx-table--bordered"><thead><tr><th class="winx-table__head">A</th></tr></thead><tbody></tbody></table>');
  draws(w, '<table class="winx-table"><thead><tr><th class="winx-table__head x-name" aria-label="the medicine" data-tip="winx-tooltip">Код</th><th class="winx-table__head winx-table__head--center">N</th></tr></thead>'
    + '<tbody><tr class="winx-table__row x-past"><td class="winx-table__cell x-name">АЕ</td><td class="winx-table__cell winx-table__cell--center"><b>10</b></td></tr>'
    + '<tr class="winx-table__row x-today"><td class="winx-table__cell x-name">МА</td><td class="winx-table__cell winx-table__cell--center"><b>20</b></td></tr></tbody></table>');
});

test("Search.pickGrouped: a header over each group's first row, the name and its note; a new one has neither", async () => {
  const { Search } = await import("#/components/uikit/Search/index.ts");
  const pick = Search.pick, drawn = [];
  const el = { createDiv: o => (drawn.push(o.text ?? o.cls), el), createSpan: o => drawn.push(o.text) };
  Search.pick = async (app, placeholder, find, render) => find("q").forEach(c => render(c, el));
  try {
    await Search.pickGrouped(null, "", () => [
      { name: "a", g: 1 }, { name: "b", g: 1 }, { name: "c", g: 2 }, { name: "d", isNew: true },
    ], { groupOf: c => c.g, label: g => `#${g}`, note: c => c.name.toUpperCase() });
  } finally { Search.pick = pick; }
  const row = "winx-search__row winx-row winx-between winx-gap-l";
  assert.deepEqual(drawn, ["#1", row, "a", "A", row, "b", "B", "#2", row, "c", "C", row, "+ new: d", ""]);
});

test("WinxCard: a cover picture above the title; none without one", () => {
  const card = mount(ui.WinxCard, { props: { title: "Trip", cover: "app://x/trip.webp" } });
  const img = card.find("img.winx-widget__cover");
  assert.equal(img.attributes("src"), "app://x/trip.webp");
  assert.equal(img.attributes("alt"), "");
  assert.equal(card.find(".winx-widget").element.firstElementChild, img.element);
  assert.equal(mount(ui.WinxCard, { props: { title: "Trip" } }).find("img").exists(), false);
});
