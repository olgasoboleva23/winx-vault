import { Component, getFrontMatterInfo, MarkdownRenderer } from "obsidian";
import { h } from "vue";
import { app } from "#/helpers/app.js";
import { useNoteLinks } from "#/composables/use.js";
import { useVueApp } from "#/composables/vueApp.ts";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";

// A note drawn inside the Winx tab, as a note in reading view would be (its properties left out):
// Finance, Shop, Supplies, Food. A title row with ✎ (the note itself, in a new tab); the body
// draws again when the note changes; its [[links]] go through useNoteLinks.
export class NotePage extends Component {
  app = app;   // for the composables (useNoteLinks: the workspace's events)
  private path: string;
  private el: HTMLElement;
  private body: HTMLElement | null = null;
  private drawn: Component | null = null;   // the body's markdown, one per render
  private pass = 0;

  constructor(path: string, el: HTMLElement) {
    super();
    this.path = path;
    this.el = el;
  }

  onload() {
    const { path } = this;

    const title = path.replace(/^.*\//, "").replace(/\.md$/, "");

    this.el.addClasses(
      ["markdown-preview-view", "markdown-rendered", "dashboard", "winx-note-page"],
    );
    const row = this.el.createDiv({ cls: "winx-note-page__row winx-row winx-between" });

    row.createSpan({ cls: "winx-note-page__title", text: title });
    useVueApp(this, row.createDiv(), {
      render: () => h(WinxButton, {
        kind: "chip", title: "Edit the note",
        onClick: () => void app.workspace.openLinkText(path, "", "tab"),
      }, () => "✎"),
    });
    this.body = this.el.createDiv();
    useNoteLinks(this, this.el);
    this.registerEvent(app.vault.on("modify", f => { if (f.path === path) void this.render(); }));
    void this.render();
  }

  async render() {
    const { body, path } = this, pass = ++this.pass;
    const file = app.vault.getFileByPath(path);
    const text = file ? await app.vault.cachedRead(file) : null;

    if (!body || pass !== this.pass) return;   // closed, or drawn again, meanwhile
    if (this.drawn) this.removeChild(this.drawn);
    const drawn = this.drawn = this.addChild(new Component());

    body.empty();
    if (text === null) {
      useVueApp(drawn, body, { render: () => h(WinxEmpty, { text: `${path} is missing` }) });
      return;
    }

    const content = text.slice(getFrontMatterInfo(text).contentStart);

    await MarkdownRenderer.render(app, content, body, path, drawn);
  }
}
