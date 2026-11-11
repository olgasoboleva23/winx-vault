import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// the Form window draws its rows with classes only (its look: uikit/Form/index.scss). The DOM
// helpers Obsidian adds to elements, the few the Form uses, written here
let Form;
before(async () => {
  GlobalRegistrator.register();
  const el = HTMLElement.prototype;
  el.createEl = function (tag, o = {}) {
    const { cls, text, type, attr = {} } = typeof o === "string" ? { cls: o } : o;
    const e = this.appendChild(document.createElement(tag));

    if (cls) e.className = cls;
    if (text) e.textContent = text;
    if (type) e.type = type;
    for (const [k, v] of Object.entries(attr)) e.setAttribute(k, v);

    return e;
  };
  el.createDiv = function (o) { return this.createEl("div", o); };
  el.createSpan = function (o) { return this.createEl("span", o); };
  el.empty = function () { this.replaceChildren(); };
  el.setText = function (t) { this.textContent = t; };
  el.setAttr = function (k, v) { this.setAttribute(k, v); };
  el.addClass = function (c) { this.classList.add(c); };
  el.toggle = function (on) { this.hidden = !on; };
  el.toggleClass = function (c, on) { this.classList.toggle(c, on); };
  el.setCssProps = function (props) { Object.assign(this.cssProps ??= {}, props); };
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

test("Form: a list of text boxes and checkboxes is a line of names, then one line a group", () => {
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
  assert.equal(win.querySelectorAll(".winx-form__line").length, 3);
  win.querySelector(".winx-form__line:last-child button").click();   // × takes it off
  assert.equal(win.querySelectorAll(".winx-form__line").length, 2);
  assert.equal(win.querySelector("[style]"), null);
  // one grid: a text box's column shares the width, a colour's, a checkbox's and the ×'s fit them
  assert.equal(win.querySelector(".winx-form__list--lines").cssProps["--winx-form-cols"],
    "minmax(0, 1fr) auto auto auto");
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
  assert.equal(win2.querySelector(".winx-form__list--lines").cssProps["--winx-form-cols"],
    "auto minmax(0, 1fr)");
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
  assert.equal(win.querySelector("[style]"), null);
});
