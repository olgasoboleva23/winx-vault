import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// each component draws the markup the styles expect (styles/uikit/*.scss): the same as the old uikit/*.js did,
// written out here; Vue's <!--v-if--> placeholders left out (no box, no style)
let mount, ui;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  const load = async n => (await import(`../src/components/uikit/${n}.vue`)).default;
  ui = Object.fromEntries(await Promise.all(["WinxButton", "WinxNoteLink", "WinxEmpty", "WinxMissing", "WinxFailed",
    "WinxGroupHeader", "WinxAddForm", "WinxCard"].map(async n => [n, await load(n)])));
});
const draws = (vue, html) => assert.equal(vue.element.outerHTML.replace(/<!--[^]*?-->/g, ""), html);

test("WinxButton: kinds, on, title, extra classes", () => {
  draws(mount(ui.WinxButton, { props: { title: "delete task" }, slots: { default: "🗑" } }),
    '<button class="winx-btn winx-btn--round" title="delete task" aria-label="delete task">🗑</button>');
  draws(mount(ui.WinxButton, { props: { kind: "pill", cls: "winx-weight__list" }, slots: { default: "✦ list" } }),
    '<button class="winx-btn winx-btn--pill winx-weight__list">✦ list</button>');
  draws(mount(ui.WinxButton, { props: { kind: "toggle", on: true }, slots: { default: "✓ done" } }), '<button class="winx-btn winx-btn--toggle winx-btn--on">✓ done</button>');
  draws(mount(ui.WinxButton, { props: { kind: "toggle" }, slots: { default: "✓ done" } }), '<button class="winx-btn winx-btn--toggle">✓ done</button>');
});

test("WinxNoteLink, WinxEmpty, WinxMissing, WinxFailed, WinxGroupHeader, WinxAddForm, WinxCard", () => {
  draws(mount(ui.WinxNoteLink, { props: { path: "x/Cycle.md" }, slots: { default: "dates" } }), '<button class="winx-btn winx-btn--pill">dates</button>');
  draws(mount(ui.WinxEmpty, { props: { text: "All bought" } }), '<div class="winx-empty">✦ All bought</div>');
  draws(mount(ui.WinxEmpty), '<div class="winx-empty">✦ Nothing here yet</div>');
  draws(mount(ui.WinxMissing, { props: { path: "x/Goals.md" } }), '<div class="winx-empty">✦ Create x/Goals.md</div>');
  draws(mount(ui.WinxFailed, { props: { text: "Goals.md is broken" } }),
    '<div class="winx-empty winx-empty--error">⚠ couldn\'t draw: Goals.md is broken<button class="winx-btn winx-btn--chip winx-empty__retry">retry</button></div>');
  draws(mount(ui.WinxGroupHeader, { props: { label: "🌿 Harvest", count: 3 } }),
    '<div class="winx-group-header"><span>🌿 Harvest</span><span class="winx-group-header__count">3</span></div>');
  draws(mount(ui.WinxGroupHeader, { props: { label: "🌿 Harvest" } }), '<div class="winx-group-header"><span>🌿 Harvest</span></div>');
  const input = { name: "kg", type: "number", placeholder: "today, kg" };
  draws(mount(ui.WinxAddForm, { props: { input, submit: "Save" } }),
    '<form class="winx-add-form"><input class="winx-add-form__input" name="kg" type="number" placeholder="today, kg"><button class="winx-add-form__submit" type="submit">Save</button></form>');
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
