// The base of every widget: a ```winx block in a note, owned by the plugin while the block is on screen.
// A widget is a class with the same parts:
//   async data()        what it shows (this.dv: Dataview's pages / page / current() / date, this.args: the block's lines)
//   view(data)          its markup: html`…` (from ../core/html.js), with Button / Card (../uikit/)
//   on = { name(e, el) } what an element with data-action="name" does: a click (a button, any element),
//                        a change (an input, a select) or a submit (a form); "open" with data-path (NoteLink)
//                        opens that note without a handler
//   after(root, data)   what markup can't do (a chart: this.keep(chart) so it's destroyed on the next draw);
//                       root is where view() went (the card's content when there's a card)
// Until its first draw a card widget shows its card with a shimmering placeholder (a skeleton).
// It draws on load and again a moment after Dataview's index or its own note changes (or the dashboard's date); a hidden block when it
// shows, a block someone is typing in when they leave it (text typed in a named field stays). Obsidian drops its
// listeners when the block goes.
// A block with a "card: Title" line (and "meta: scroll") is drawn inside a dashboard card with that title.
import { MarkdownRenderChild, debounce, sanitizeHTMLToDom } from "obsidian";
import { Card } from "../uikit/card.js";
import { html } from "../core/html.js";
import { actionOf } from "./parse.js";

const DELAY = 1000;   // ms after the last change: typing in a note changes the index on every key

export class Widget extends MarkdownRenderChild {
  static followsChanges = true;   // false: drawn once (a widget that doesn't show vault data, like the pomodoro timer)

  constructor(el, sourcePath, args = {}) {
    super(el);
    this.sourcePath = sourcePath;
    this.args = args;
    this.on = {};
    this.kept = [];
    this.stale = false;
  }

  async data() { return {}; }
  view(data) { return { html: "" }; }
  after(root, data) {}

  get dv() {
    const api = this.app.plugins.plugins.dataview?.api;
    return api && {
      pages: q => api.pages(q, this.sourcePath),
      page: p => api.page(p, this.sourcePath),
      // the page: its note, with the date of the tab it's drawn in (the dashboard's data-date) over the note's
      current: () => {
        const page = api.page(this.sourcePath), date = this.containerEl.closest("[data-date]")?.dataset.date;
        return date ? { ...page, date: api.date(date) } : page;
      },
      date: d => api.date(d),
      api,
    };
  }
  get app() { return window.app; }

  // a chart or anything with destroy(), dropped on the next draw
  keep(thing) { this.kept.push(thing); return thing; }

  async onload() {
    const act = e => {
      const el = actionOf(e.type, e.target, this.containerEl);
      const fn = el && (this.on[el.dataset.action] ?? (el.dataset.action === "open" && el.dataset.path ? () => this.app.workspace.openLinkText(el.dataset.path, this.sourcePath) : null));
      if (!fn) return;
      if (e.type === "submit") e.preventDefault();
      fn.call(this, e, el);
    };
    for (const type of ["click", "change", "submit"]) this.registerDomEvent(this.containerEl, type, act);
    // after leaving a field: a moment later, so a click on the widget's own button (which takes the focus) lands first
    const left = debounce(() => this.catchUp(), 500, true), later = debounce(() => this.redraw(), DELAY, true);
    this.registerDomEvent(this.containerEl, "focusout", left);
    if (this.constructor.followsChanges) {
      this.registerEvent(this.app.metadataCache.on("dataview:metadata-change", later));
      this.registerEvent(this.app.metadataCache.on("changed", f => f.path === this.sourcePath && later()));
      // the dashboard tab's date changed: drawn again in place, at once
      this.registerEvent(this.app.workspace.on("winx:date", () => this.containerEl.closest("[data-date]") && this.redraw()));
    }
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.catchUp()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.catchUp()));
    this.register(() => { left.cancel(); later.cancel(); this.drop(); });
    this.skeleton();
    // a cold start: Dataview reads the vault after the notes open; draw once it has
    const api = this.app.plugins.plugins.dataview?.api;
    if (api && !api.index?.initialized && this.constructor.followsChanges) {
      this.registerEvent(this.app.metadataCache.on("dataview:index-ready", () => this.draw()));
      return;
    }
    await this.draw();
  }

  // drawn now, or once it shows and nobody is typing in it
  redraw() { this.shown && !this.typing ? this.draw() : (this.stale = true); }
  catchUp() { if (this.stale) this.redraw(); }
  // on screen: a card widget's block has no box of its own (display: contents), so ask the card
  get shown() { return (this.containerEl.firstElementChild ?? this.containerEl).isShown(); }
  get typing() { return this.containerEl.contains(document.activeElement) && document.activeElement.matches("input, textarea, select"); }

  // a card widget before its first draw: its card with a shimmering placeholder
  skeleton() {
    if (this.args.card) this.containerEl.replaceChildren(sanitizeHTMLToDom(new Card({ title: String(this.args.card), body: html`<div class="winx-skeleton"></div>` }).html));
  }
  // what someone typed and hasn't saved: () => the fields (by their name) get their text back after a draw
  keepTyped() {
    const typed = [...this.containerEl.querySelectorAll("input[name], textarea[name]")].filter(f => f.value).map(f => [f.name, f.value]);
    return () => { for (const [name, value] of typed) { const f = this.containerEl.querySelector(`[name="${CSS.escape(name)}"]`); if (f && !f.value) f.value = value; } };
  }

  drop() { for (const k of this.kept.splice(0)) k?.destroy?.(); }

  async draw() {
    this.stale = false;
    const data = await this.data();
    this.drop();
    const restore = this.keepTyped();
    const body = this.view(data), { card, meta } = this.args;
    const markup = card ? new Card({ title: String(card), meta: meta ? String(meta).split(/\s+/) : [], body, button: this.cardButton?.() ?? "" }) : body;
    this.containerEl.replaceChildren(sanitizeHTMLToDom(markup.html));
    restore();
    // the widget's own place: inside the card when there is one
    const root = card ? this.containerEl.querySelector(":scope > .callout > .callout-content") : this.containerEl;
    await this.after(root, data);
    this.containerEl.dispatchEvent(new CustomEvent("winx-drawn", { bubbles: true }));   // the dashboard tab's ✦ pill goes
  }
}
