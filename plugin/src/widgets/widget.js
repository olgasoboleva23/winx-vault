// The base of every widget: a ```winx block in a note, owned by the plugin while the block is on screen.
// A widget is a class with the same parts:
//   async data()        what it shows (this.dv: Dataview's pages / page / current() / date, this.args: the block's
//                       lines)
//   view(data)          its markup: html`…` (from ../core/html.js), with Button / Card (../uikit/)
//   on = { name(e, el) } what an element with data-action="name" does: a click (a button, any element),
//                        a change (an input, a select) or a submit (a form); "open" with data-path (NoteLink)
//                        opens that note without a handler
//   after(root, data)   what markup can't do (a chart: this.keep(chart) so it's destroyed on the next draw);
//                       root is where view() went (the card's content when there's a card)
// Until its first draw a card widget shows its card with a shimmering placeholder (a skeleton). A draw overtaken by
// a newer one, or ending after the block went, writes nothing; an error in data() shows "✦ couldn't draw: …".
// It draws on load and again a moment after Dataview's index or its own note changes (or the dashboard's date); a
// hidden block when it shows, a block someone is typing in when they leave it (text typed in a named field stays).
// Obsidian drops its listeners when the block goes.
// A block with a "card: Title" line (and "meta: scroll") is drawn inside a dashboard card with that title.
import { MarkdownRenderChild, sanitizeHTMLToDom } from "obsidian";
import { Card } from "../uikit/card.js";
import { Failed } from "../uikit/empty.js";
import { html } from "../core/html.js";
import { useActions, useDataviewChanges, useLeaveField, useRedraw, useTabDate, useWhenIndexed } from "../core/use.js";
import { dataview } from "../core/plugins.js";
import { app } from "../core/app.js";

const DELAY = 1000;   // ms after the last change: typing in a note changes the index on every key

export class Widget extends MarkdownRenderChild {
  static followsChanges = true;   // false: drawn once (a widget that doesn't show vault data, like the pomodoro timer)

  constructor(el, sourcePath, args = {}) {
    super(el);
    this.sourcePath = sourcePath;
    this.args = args;
    this.on = {};
    this.kept = [];
    this.draws = 0;   // a draw is stale once a newer one starts or the block goes (onunload)
  }

  async data() { return {}; }
  view(data) { return { html: "" }; }
  after(root, data) {}

  get dv() {
    const api = dataview();
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
  get app() { return app; }

  // a chart or anything with destroy(), dropped on the next draw
  // a block that's gone lets go at once of what a late after() makes
  keep(thing) { this.draws < 0 ? thing?.destroy?.() : this.kept.push(thing); return thing; }

  async onload() {
    useActions(this, this.containerEl, (name, el) => this.action(name, el), ["click", "change", "submit"]);
    // drawn now, or once it shows and nobody is typing in it (catchUp: ask again after leaving a field)
    ({ redraw: this.redraw, catchUp: this.catchUp } =
      useRedraw(this, () => this.shown && !this.typing, () => this.draw()));
    useLeaveField(this, this.containerEl, () => this.catchUp());
    this.register(() => this.drop());
    this.skeleton();
    if (!this.constructor.followsChanges) return void this.draw();
    // a moment after Dataview's index or the widget's own note changes; at once when the dashboard's date does
    useDataviewChanges(this, () => this.redraw(), { note: this.sourcePath, delay: DELAY });
    useTabDate(this, this.containerEl, () => this.redraw());
    useWhenIndexed(this, () => this.draw());
  }

  // a data-action's handler: the widget's own (on), else the base's: open a note, retry a draw that failed
  action(name, el) {
    return this.on[name]?.bind(this)
      ?? (name === "open" && el?.dataset.path ? () => this.app.workspace.openLinkText(el.dataset.path, this.sourcePath)
      : name === "retry" ? () => this.draw() : null);
  }

  // on screen: a card widget's block has no box of its own (display: contents), so ask the card
  get shown() { return (this.containerEl.firstElementChild ?? this.containerEl).isShown(); }
  get typing() {
    const el = document.activeElement;
    return this.containerEl.contains(el) && el.matches("input, textarea, select");
  }

  // a card widget before its first draw: its card with a shimmering placeholder
  skeleton() {
    if (!this.args.card) return;
    const card = new Card({ title: String(this.args.card), body: html`<div class="winx-widget__skeleton"></div>` });
    this.containerEl.replaceChildren(sanitizeHTMLToDom(card.html));
  }
  // what someone typed and hasn't saved: () => the fields (by their name) get their text back after a draw
  keepTyped() {
    const typed = [...this.containerEl.querySelectorAll("input[name], textarea[name]")]
      .filter(f => f.value).map(f => [f.name, f.value]);
    return () => {
      for (const [name, value] of typed) {
        const f = this.containerEl.querySelector(`[name="${CSS.escape(name)}"]`);
        if (f && !f.value) f.value = value;
      }
    };
  }

  drop() { for (const k of this.kept.splice(0)) k?.destroy?.(); }
  onunload() { this.draws = -1; }

  async draw() {
    if (this.draws < 0) return;
    const n = ++this.draws;
    try {
      const data = await this.data();
      if (n !== this.draws) return;   // a newer draw is on its way, or the block is gone
      this.drop();
      const restore = this.keepTyped();
      const body = this.view(data), { card, meta } = this.args;
      const markup = card
        ? new Card({
          title: String(card), meta: meta ? String(meta).split(/\s+/) : [], body, button: this.cardButton?.() ?? "",
        })
        : body;
      this.containerEl.replaceChildren(sanitizeHTMLToDom(markup.html));
      restore();
      // the widget's own place: inside the card when there is one
      const root = card
        ? this.containerEl.querySelector(":scope > .winx-widget > .winx-widget__body")
        : this.containerEl;
      await this.after(root, data);
      if (n !== this.draws) return;   // gone, or drawn again, meanwhile
    } catch (e) {   // in data(), view() or after(): said in the block, with ↻ retry
      if (n !== this.draws) return;
      console.error(e);
      this.drop();
      return void this.containerEl.replaceChildren(sanitizeHTMLToDom(new Failed({ text: e.message }).html));
    }
    // the dashboard tab's ✦ pill goes
    this.containerEl.dispatchEvent(new CustomEvent("winx-drawn", { bubbles: true }));
  }
}
