import { test } from "node:test";
import assert from "node:assert/strict";
import { bem, html, raw } from "../src/core/html.js";

test("put-in text is escaped", () => {
  assert.equal(html`<b>${"a < b & c"}</b>`.html, "<b>a &lt; b &amp; c</b>");
  assert.equal(html`<div title="${'say "hi" <now>'}"></div>`.html, '<div title="say &quot;hi&quot; &lt;now&gt;"></div>');
  assert.equal(html`<i>${"it's"}</i>`.html, "<i>it&#39;s</i>");
});

test("nested templates and raw() go in as they are", () => {
  const item = name => html`<li>${name}</li>`;
  assert.equal(html`<ul>${["tea", "<cake>"].map(item)}</ul>`.html, "<ul><li>tea</li><li>&lt;cake&gt;</li></ul>");
  assert.equal(html`<p>${raw("<i>x</i>")}</p>`.html, "<p><i>x</i></p>");
});

test("null, undefined and false leave nothing; numbers stay", () => {
  assert.equal(html`<p>${null}${undefined}${false}${0}${12.5}</p>`.html, "<p>012.5</p>");
  assert.equal(html`<p>${[1, null, 2]}</p>`.html, "<p>12</p>");
});

test("a template across lines: whitespace with a line break in it goes (as in JSX), spaces on a line stay", () => {
  const name = "tea";
  assert.equal(html`<div class="a">
      <b>${name}</b> <i>x</i>
      ${name}
    </div>`.html, '<div class="a"><b>tea</b> <i>x</i>tea</div>');
});

test("bem: the class with a --modifier for each one that holds", () => {
  assert.equal(bem("winx-cal__day", { today: true, picked: false }), "winx-cal__day winx-cal__day--today");
  assert.equal(bem("winx-goal__dot", { done: 1, sel: 0 }), "winx-goal__dot winx-goal__dot--done");
  assert.equal(bem("winx-btn"), "winx-btn");
});
