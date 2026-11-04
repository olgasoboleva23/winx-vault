import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// each Vue component draws what its uikit/*.js twin draws, without data-action / data-* (Vue's @click does that)
// and without Vue's <!--v-if--> placeholders (no box, no style)
let mount, ui;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  const load = async n => (await import(`../src/vue/${n}.vue`)).default;
  ui = Object.fromEntries(await Promise.all(["WinxButton", "WinxNoteLink", "WinxEmpty", "WinxMissing", "WinxFailed",
    "WinxGroupHeader", "WinxAddForm", "WinxCard"].map(async n => [n, await load(n)])));
});
const tidy = html => {
  const box = document.createElement("div");
  box.innerHTML = html.replace(/<!--[^]*?-->/g, "");
  box.querySelectorAll("*").forEach(e => [...e.attributes].filter(a => a.name.startsWith("data-") && !a.name.startsWith("data-callout"))
    .forEach(a => e.removeAttribute(a.name)));
  return box.innerHTML;
};
const same = (vue, old) => assert.equal(tidy(vue.element.outerHTML), tidy(old.html));

test("WinxButton draws as Button: kinds, on, title, extra classes", async () => {
  const { Button } = await import("../src/uikit/button.js");
  same(mount(ui.WinxButton, { props: { title: "delete task" }, slots: { default: "🗑" } }),
    new Button({ icon: "🗑", title: "delete task", action: "remove" }));
  same(mount(ui.WinxButton, { props: { kind: "pill", cls: "winx-weight__list" }, slots: { default: "✦ list" } }),
    new Button({ text: "✦ list", action: "x", kind: "pill", cls: "winx-weight__list" }));
  for (const on of [true, false])
    same(mount(ui.WinxButton, { props: { kind: "toggle", on }, slots: { default: "✓ done" } }),
      new Button({ text: "✓ done", kind: "toggle", on, action: "showDone" }));
});

test("WinxNoteLink, WinxEmpty, WinxMissing, WinxFailed, WinxGroupHeader, WinxAddForm, WinxCard draw as their twins",
  async () => {
    const { NoteLink } = await import("../src/uikit/noteLink.js");
    const { Empty, Missing, Failed } = await import("../src/uikit/empty.js");
    const { GroupHeader } = await import("../src/uikit/groupHeader.js");
    const { AddForm } = await import("../src/uikit/addForm.js");
    const { Card } = await import("../src/uikit/card.js");
    const { html } = await import("../src/core/html.js");
    same(mount(ui.WinxNoteLink, { props: { path: "x/Cycle.md" }, slots: { default: "dates" } }),
      new NoteLink({ text: "dates", path: "x/Cycle.md" }));
    same(mount(ui.WinxEmpty, { props: { text: "All bought" } }), new Empty({ text: "All bought" }));
    same(mount(ui.WinxEmpty), new Empty());
    same(mount(ui.WinxMissing, { props: { path: "x/Goals.md" } }), new Missing({ path: "x/Goals.md" }));
    same(mount(ui.WinxFailed, { props: { text: "Goals.md is broken" } }), new Failed({ text: "Goals.md is broken" }));
    same(mount(ui.WinxGroupHeader, { props: { label: "🌿 Harvest", count: 3 } }),
      new GroupHeader({ label: "🌿 Harvest", count: 3 }));
    same(mount(ui.WinxGroupHeader, { props: { label: "🌿 Harvest" } }), new GroupHeader({ label: "🌿 Harvest" }));
    const input = { name: "kg", type: "number", placeholder: "today, kg" };
    same(mount(ui.WinxAddForm, { props: { input, submit: "Save" } }), new AddForm({ action: "save", input, submit: "Save" }));
    same(mount(ui.WinxCard, { props: { title: "Weight", meta: ["scroll"] }, slots: { default: "<b>40 kg</b>" } }),
      new Card({ title: "Weight", meta: ["scroll"], body: html`<b>40 kg</b>` }));
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
