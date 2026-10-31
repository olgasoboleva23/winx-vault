import { test } from "node:test";
import assert from "node:assert/strict";
import { actionOf } from "../src/widgets/parse.js";

// tiny stand-ins for elements: a tag, an optional data-action, a parent
const el = (tag, action, parent = null) => ({
  tag, parent, dataset: action ? { action } : {},
  matches(sel) { return sel.split(",").map(s => s.trim()).includes(this.tag) || (sel === "[data-action]" && !!action); },
  closest(sel) { for (let e = this; e; e = e.parent) if (e.matches(sel)) return e; return null; },
});
const root = el("div"); root.contains = e => { for (let x = e; x; x = x.parent) if (x === root) return true; return false; };

test("a field's change doesn't reach its form's action; the form's submit does", () => {
  const form = el("form", "add", root), input = el("input", null, form), select = el("select", null, form);
  assert.equal(actionOf("change", input, root), null);
  assert.equal(actionOf("change", select, root), null);
  assert.equal(actionOf("submit", form, root), form);
  assert.equal(actionOf("click", input, root), null);        // a click in a form's field isn't the form's action
});

test("a button's click, a field's own change", () => {
  const btn = el("button", "buy", root), span = el("span", null, btn), sel = el("select", "pick", root);
  assert.equal(actionOf("click", span, root), btn);          // a click on the button's text
  assert.equal(actionOf("change", sel, root), sel);
  assert.equal(actionOf("click", el("button", "x", el("div")), root), null);   // not inside this widget
});
