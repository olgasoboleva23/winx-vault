import { test } from "node:test";
import assert from "node:assert/strict";
import { html, raw } from "../src/ui/html.js";

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
