import { test } from "node:test";
import assert from "node:assert/strict";
import { Widget } from "../src/widgets/widget.js";

// a block's element: what was drawn into it
const block = () => ({ drawn: null, replaceChildren(x) { this.drawn = x; }, querySelectorAll: () => [], dispatchEvent() {} });
// a widget whose data() waits until the test lets it go (or throws)
class Slow extends Widget {
  waits = [];
  data() { return new Promise((ok, fail) => this.waits.push({ ok, fail })); }
  view(d) { return { html: `<b>${d.n}</b>` }; }
}

test("a draw overtaken by a newer one doesn't put its old data in", async () => {
  const w = new Slow(block(), "note.md");
  const first = w.draw(), second = w.draw();
  w.waits[1].ok({ n: 2 }); await second;
  w.waits[0].ok({ n: 1 }); await first;
  assert.equal(w.containerEl.drawn, "<b>2</b>");
});

test("a draw that ends after the block went writes nothing", async () => {
  const w = new Slow(block(), "note.md");
  const d = w.draw();
  w.onunload();
  w.waits[0].ok({ n: 1 }); await d;
  assert.equal(w.containerEl.drawn, null);
});

test("an error in data() shows a message, not a blank block", async () => {
  const w = new Slow(block(), "note.md");
  const d = w.draw();
  w.waits[0].fail(new Error("Goals.md is broken")); await d;
  assert.match(w.containerEl.drawn, /couldn(&#39;|')t draw: Goals\.md is broken/);
});
