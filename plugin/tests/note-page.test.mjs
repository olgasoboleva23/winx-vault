import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { MarkdownRenderer } from "obsidian";
import { setApp } from "#/helpers/app.js";

// A note drawn inside the Winx tab: without its properties, with the note as sourcePath
let NotePage, files, modify, opened;

before(async () => {
  GlobalRegistrator.register();
  Object.assign(HTMLElement.prototype, {
    addClasses(c) { this.classList.add(...c); },
    empty() { this.replaceChildren(); },
    createDiv(o = {}) { return this.createEl("div", o); },
    createSpan(o = {}) { return this.createEl("span", o); },
    createEl(tag, { cls, text } = {}) {
      const e = this.appendChild(document.createElement(tag));
      if (cls) e.className = cls;
      if (text) e.textContent = text;
      return e;
    },
  });
  ({ NotePage } = await import("#/components/app/NotePage.ts"));
});

function page(path, texts) {
  files = texts;
  opened = [];
  MarkdownRenderer.calls.length = 0;
  setApp({
    vault: {
      getFileByPath: p => (p in files ? { path: p } : null),
      cachedRead: async f => files[f.path],
      on: (name, fn) => { if (name === "modify") modify = fn; return {}; },
    },
    workspace: { openLinkText: async (...a) => opened.push(a) },
  });
  const el = document.body.appendChild(document.createElement("div"));
  const note = new NotePage(path, el);

  note.load();
  return { el, note, settle: () => new Promise(r => setTimeout(r)) };
}

test("renders the note without its properties, with the note as sourcePath", async () => {
  const path = "02 Areas/Finance.md";
  const { el, settle } = page(path, { [path]: "---\na: 1\n---\n# Money\n" });

  await settle();
  assert.deepEqual(MarkdownRenderer.calls.map(c => c.slice(0, 2)), [["# Money\n", path]]);
  assert.ok(el.classList.contains("winx-note-page"));
  assert.equal(el.querySelector(".winx-note-page__title").textContent, "Finance");
  el.querySelector("button").click();
  assert.deepEqual(opened, [[path, "", "tab"]]);
});

test("the note changed: drawn again, the old child unloaded", async () => {
  const { note, settle } = page("a.md", { "a.md": "one" });

  await settle();
  const [[, , first]] = MarkdownRenderer.calls;

  files["a.md"] = "two";
  modify({ path: "other.md" });
  modify({ path: "a.md" });
  await settle();
  assert.deepEqual(MarkdownRenderer.calls.map(c => c[0]), ["one", "two"]);
  assert.equal(first._loaded, false);
  assert.equal(MarkdownRenderer.calls[1][2]._loaded, true);
  note.unload();
});

test("a render that lands after the page unloaded is dropped", async () => {
  const { note, settle } = page("a.md", { "a.md": "one" });

  note.unload();
  await settle();
  assert.deepEqual(MarkdownRenderer.calls, []);
});

test("a missing note says so", async () => {
  const { el, settle } = page("gone.md", {});

  await settle();
  assert.deepEqual(MarkdownRenderer.calls, []);
  assert.match(el.textContent, /✦ gone\.md is missing/);
});
