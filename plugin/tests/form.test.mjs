import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// the Form window draws its rows with classes only (its look: uikit/Form/index.scss); the only
// inline style is a lines list's columns. The DOM helpers Obsidian adds, the two the Form uses
let Form, nextTick;
before(async () => {
  GlobalRegistrator.register();
  HTMLElement.prototype.setText = function (t) { this.textContent = t; };
  HTMLElement.prototype.addClass = function (c) { this.classList.add(c); };
  ({ nextTick } = await import("vue"));
  ({ Form } = await import("#/components/uikit/Form/index.ts"));
});

const open = (rows, values) => {
  const app = { vault: { getResourcePath: () => "app://icon.webp" } };
  const form = new Form(app, "✦ Test", rows, { values });

  Object.assign(form, {
    titleEl: document.createElement("div"), contentEl: document.createElement("div"),
    scope: { register() {} },
  });
  form.onOpen();

  return form.contentEl;
};
const classes = els => [...els].map(e => e.className);
const cols = win => win.querySelector(".winx-form__list--lines").style
  .getPropertyValue("--winx-form-cols");
// no inline style but a lines list's columns
const styled = win => [...win.querySelectorAll("[style]")].map(e => e.getAttribute("style"));

test("Form: a list of text boxes and checkboxes is a line of names, then one line a group", async () => {
  const win = open([
    { name: "Title", key: "title", text: "a title" },
    { name: "Areas", key: "areas", list: [
      { name: "Name", key: "name", text: "Body" },
      { name: "Colour", key: "color", text: "#e8609a", color: true },
      { name: "Apply", key: "apply", check: "move its tasks" },
    ] },
  ]);
  const [head, group] = win.querySelectorAll(".winx-form__list--lines > .winx-form__line");
  const narrow = "winx-form__cell winx-form__cell--narrow";

  assert.ok(win.classList.contains("winx-form"));
  assert.ok(win.querySelector(".setting-item-info").classList.contains("winx-form__info"));
  assert.equal(head.className, "winx-form__line winx-form__line--head");
  assert.deepEqual(classes(head.children), ["winx-form__cell", narrow, narrow, narrow]);
  assert.deepEqual([...head.children].map(c => c.textContent), ["Name", "Colour", "Apply", ""]);
  assert.equal(head.children[2].title, "move its tasks");
  assert.deepEqual(classes(group.children), ["winx-form__cell", narrow, narrow, narrow]);
  assert.equal(group.querySelector("input[type=text]").className, "winx-form__input");
  assert.equal(win.querySelectorAll(".winx-form__line").length, 2);

  win.querySelector(".winx-form__more button").click();   // + adds a group's line
  await nextTick();
  assert.equal(win.querySelectorAll(".winx-form__line").length, 3);
  win.querySelector(".winx-form__line:last-child button").click();   // × takes it off
  await nextTick();
  assert.equal(win.querySelectorAll(".winx-form__line").length, 2);
  // one grid: a text box's column shares the width, a colour's, a checkbox's and the ×'s fit them
  assert.equal(cols(win), "minmax(0, 1fr) auto auto auto");
  assert.deepEqual(styled(win), ["--winx-form-cols: minmax(0, 1fr) auto auto auto;"]);
});

test("Form: a fixed list has no + or ×, a label row shows its value as text", () => {
  const win = open([{ tab: "Difficulties", name: "Difficulties", key: "d", fixed: true, list: [
    { name: "Difficulty", key: "label", label: true },
    { name: "XP", key: "xp", text: "XP", number: true },
  ] }]);
  const lines = win.querySelectorAll(".winx-form__line:not(.winx-form__line--head)");

  assert.equal(lines.length, 0);   // no values: no groups, none added
  const win2 = open([{ name: "Difficulties", key: "d", fixed: true, list: [
    { name: "Difficulty", key: "label", label: true },
    { name: "XP", key: "xp", text: "XP", number: true },
  ] }], { d: [{ label: "⭐ Easy", xp: 5 }] });
  const [, line] = win2.querySelectorAll(".winx-form__line");

  assert.equal(line.querySelector(".winx-form__label").textContent, "⭐ Easy");
  assert.equal(line.querySelector("input").value, "5");
  assert.equal(win2.querySelectorAll("button").length, 1);   // the window's own button only
  assert.equal(cols(win2), "auto minmax(0, 1fr)");
  assert.equal(win.querySelector(".setting-item-name"), null);   // named as its tab: no heading
});

test("Form: a list with buttons or long text keeps its groups stacked, rows inside", () => {
  const icon = { path: "icon.webp" };
  const win = open([{ name: "Courses", key: "courses", list: [
    { name: "When", key: "when", options: [{ label: "morning", value: "m", img: icon }] },
    { name: "Note", key: "note", text: "a note", lines: true },
  ] }]);
  const group = win.querySelector(".winx-form__list > .winx-form__group");

  assert.equal(win.querySelector(".winx-form__list").className, "winx-form__list");
  assert.equal(group.querySelectorAll(".setting-item").length, 2);
  assert.ok(group.querySelector("img.winx-form__img"));
  assert.equal(group.querySelector("textarea").className, "winx-form__textarea");
  assert.equal(group.querySelector("textarea").getAttribute("rows"), "4");
  assert.equal(win.querySelector(".winx-form__line"), null);
  assert.deepEqual(styled(win), []);
});


test("Form: a row can keep a fixed numeric value read-only for selected records", () => {
  const rows = [{ name: "XP", key: "xp", text: "XP", number: true,
    readonly: values => values.key === "none" }];
  assert.equal(open(rows, { key: "none", xp: 0 }).querySelector("input").readOnly, true);
  assert.equal(open(rows, { key: "easy", xp: 5 }).querySelector("input").readOnly, false);
});


test("Form: dependent choices follow edited variant names and keep the selected value", async () => {
  const win = open([
    { name: "Variants", key: "variants", text: "one per line", lines: true },
    { name: "Next variant", key: "next", options: values => values.variants.split("\n")
      .filter(Boolean).map(value => ({ label: value, value })) },
  ], { variants: "Core\nArms", next: "Arms" });
  const rows = win.querySelectorAll(".setting-item");
  assert.equal(rows[1].querySelector(".mod-cta").textContent, "Arms");
  const field = win.querySelector("textarea");
  field.value = "Core\nArms\nLegs"; field.dispatchEvent(new Event("input"));
  await nextTick();
  assert.deepEqual([...rows[1].querySelectorAll("button")].map(b => b.textContent), ["Core", "Arms", "Legs"]);
  assert.equal(rows[1].querySelector(".mod-cta").textContent, "Arms");
  rows[1].querySelector("button:last-child").click();
  await nextTick();
  assert.equal(rows[1].querySelector(".mod-cta").textContent, "Legs");
});
