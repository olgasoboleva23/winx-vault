import { test } from "node:test";
import assert from "node:assert/strict";
import { html } from "../src/ui/html.js";
import { Component, Button, Card } from "../src/ui/component.js";

test("a component goes into markup as it is, its props into its view", () => {
  class Hello extends Component { view({ name }) { return html`<p>hi ${name}</p>`; } }
  assert.equal(html`<div>${new Hello({ name: "<Bo>" })}</div>`.html, "<div><p>hi &lt;Bo&gt;</p></div>");
});

test("Button: an action by name, a title, a kind", () => {
  assert.equal(new Button({ icon: "🗑", title: "delete task", action: "remove" }).html,
    '<button class="winx-btn round" data-action="remove" title="delete task" aria-label="delete task">🗑</button>');
  assert.equal(new Button({ text: "✦ list", action: "openList", kind: "pill", cls: "winx-weight-list" }).html,
    '<button class="winx-btn pill winx-weight-list" data-action="openList">✦ list</button>');
  assert.equal(new Button({ text: "low", action: "low", data: { name: 'tea "green"', tag: "#food" } }).html,
    '<button class="winx-btn round" data-action="low" data-name="tea &quot;green&quot;" data-tag="#food">low</button>');
});

test("Button: a toggle is lit by on; a nav arrow keeps its sign for screen readers", () => {
  assert.equal(new Button({ text: "✓ done", kind: "toggle", on: true, action: "showDone" }).html,
    '<button class="winx-btn toggle on" data-action="showDone">✓ done</button>');
  assert.equal(new Button({ text: "✓ done", kind: "toggle", on: false, action: "showDone" }).html,
    '<button class="winx-btn toggle" data-action="showDone">✓ done</button>');
  assert.equal(new Button({ icon: "›", kind: "nav", action: "next", title: "next" }).html,
    '<button class="winx-btn nav" data-action="next" title="next" aria-label="next">›</button>');
});

test("Card: the markup Obsidian draws for a > [!card] callout, the body as it is", () => {
  assert.equal(new Card({ title: "Weight", body: html`<b>40 kg</b>` }).html,
    '<div class="callout" data-callout="card" data-callout-metadata="" data-callout-fold="">' +
    '<div class="callout-title" dir="auto"><div class="callout-icon"></div><div class="callout-title-inner">Weight</div></div>' +
    '<div class="callout-content"><b>40 kg</b></div></div>');
  assert.match(new Card({ title: "Quests", meta: ["scroll"], body: "" }).html, /data-callout-metadata="scroll"/);
});
