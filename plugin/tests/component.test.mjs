import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "../src/core/html.js";
import { Component } from "../src/uikit/component.js";
import { Button } from "../src/uikit/button.js";
import { Card } from "../src/uikit/card.js";

test("a component goes into markup as it is, its props into its view", () => {
  class Hello extends Component { view({ name }) { return html`<p>hi ${name}</p>`; } }
  assert.equal(html`<div>${new Hello({ name: "<Bo>" })}</div>`.html, "<div><p>hi &lt;Bo&gt;</p></div>");
});

test("Button: an action by name, a title, a kind", () => {
  assert.equal(new Button({ icon: "🗑", title: "delete task", action: "remove" }).html,
    '<button class="winx-btn winx-btn--round" data-action="remove" title="delete task" aria-label="delete task">🗑</button>');
  assert.equal(new Button({ text: "✦ list", action: "openList", kind: "pill", cls: "winx-weight-list" }).html,
    '<button class="winx-btn winx-btn--pill winx-weight-list" data-action="openList">✦ list</button>');
  assert.equal(new Button({ text: "low", action: "low", data: { name: 'tea "green"', tag: "#food" } }).html,
    '<button class="winx-btn winx-btn--round" data-action="low" data-name="tea &quot;green&quot;" data-tag="#food">low</button>');
});

test("Button: a toggle is lit by on; a nav arrow keeps its sign for screen readers", () => {
  assert.equal(new Button({ text: "✓ done", kind: "toggle", on: true, action: "showDone" }).html,
    '<button class="winx-btn winx-btn--toggle winx-btn--on" data-action="showDone">✓ done</button>');
  assert.equal(new Button({ text: "✓ done", kind: "toggle", on: false, action: "showDone" }).html,
    '<button class="winx-btn winx-btn--toggle" data-action="showDone">✓ done</button>');
  assert.equal(new Button({ icon: "›", kind: "nav", action: "next", title: "next" }).html,
    '<button class="winx-btn winx-btn--nav" data-action="next" title="next" aria-label="next">›</button>');
});

test("Card: the markup Obsidian draws for a > [!card] callout, the body as it is", () => {
  assert.equal(new Card({ title: "Weight", body: html`<b>40 kg</b>` }).html,
    '<div class="callout" data-callout="card" data-callout-metadata="" data-callout-fold="">' +
    '<div class="callout-title" dir="auto"><div class="callout-icon"></div><div class="callout-title-inner">Weight</div></div>' +
    '<div class="callout-content"><b>40 kg</b></div></div>');
  assert.match(new Card({ title: "Quests", meta: ["scroll"], body: "" }).html, /data-callout-metadata="scroll"/);
});

test("NoteLink, Empty / Missing, GroupHeader, AddForm", async () => {
  const { NoteLink } = await import("../src/uikit/noteLink.js");
  const { Empty, Missing } = await import("../src/uikit/empty.js");
  const { GroupHeader } = await import("../src/uikit/groupHeader.js");
  const { AddForm } = await import("../src/uikit/addForm.js");
  assert.equal(new NoteLink({ text: "dates", path: "02 Areas/Cycle.md" }).html,
    '<button class="winx-btn winx-btn--pill" data-action="open" data-path="02 Areas/Cycle.md">dates</button>');
  assert.equal(new Empty({ text: "✨ All bought" }).html, '<div class="winx-empty">✨ All bought</div>');
  assert.equal(new Missing({ path: "x/Goals.md" }).html, '<div class="winx-empty">Create x/Goals.md</div>');
  assert.equal(new GroupHeader({ label: "🌿 Harvest", count: 3 }).html, '<div class="market-group-header"><span>🌿 Harvest</span><span class="market-count">3</span></div>');
  assert.equal(new GroupHeader({ label: "🌿 Harvest" }).html, '<div class="market-group-header"><span>🌿 Harvest</span></div>');
  assert.equal(new AddForm({ action: "save", input: { name: "kg", type: "number" }, submit: "Save" }).html,
    '<form class="winx-add-form" data-action="save"><input name="kg" type="number"><button type="submit">Save</button></form>');
});
