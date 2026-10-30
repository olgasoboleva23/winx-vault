// The base of every widget: a ```winx block in a note, owned by the plugin while the block is on screen.
// A widget is a class with the same parts:
//   async data()        what it shows (this.dv: Dataview's pages / page / current() / date, this.args: the block's lines)
//   view(data)          its markup: html`…` (from ../ui/html.js), with Button / Card (../ui/component.js)
//   on = { name(e, el) } what an element with data-action="name" does: a click (a button, any element),
//                        a change (an input, a select) or a submit (a form)
//   after(root, data)   what markup can't do (a chart: this.keep(chart) so it's destroyed on the next draw);
//                       root is where view() went (the card's content when there's a card)
// It draws on load and again a moment after Dataview's index or its own note changes; a hidden block when it
// shows, a block someone is typing in when they leave it (text typed in a named field stays). Obsidian drops its
// listeners when the block goes.
// A block with a "card: Title" line (and "meta: scroll") is drawn inside a dashboard card with that title.
import { MarkdownRenderChild, sanitizeHTMLToDom } from "obsidian";
import { Card } from "../ui/component.js";

const DELAY = 1000;   // ms after the last change: typing in a note changes the index on every key

export class Widget extends MarkdownRenderChild {
  constructor(el, sourcePath, args = {}) {
    super(el);
    this.sourcePath = sourcePath;
    this.args = args;
    this.on = {};
    this.kept = [];
    this.stale = false;
    this.timer = 0;
  }

  async data() { return {}; }
  view(data) { return { html: "" }; }
  after(root, data) {}

  get dv() {
    const api = this.app.plugins.plugins.dataview?.api;
    return api && {
      pages: q => api.pages(q, this.sourcePath),
      page: p => api.page(p, this.sourcePath),
      current: () => api.page(this.sourcePath),
      date: d => api.date(d),
      api,
    };
  }
  get app() { return window.app; }

  // a chart or anything with destroy(), dropped on the next draw
  keep(thing) { this.kept.push(thing); return thing; }

  async onload() {
    const act = (types, ignore) => e => {
      const el = e.target.closest?.("[data-action]");
      if (!el || !this.containerEl.contains(el) || (ignore && el.matches(ignore)) || !types.includes(e.type)) return;
      const fn = this.on[el.dataset.action];
      if (!fn) return;
      if (e.type === "submit") e.preventDefault();
      fn.call(this, e, el);
    };
    this.registerDomEvent(this.containerEl, "click", act(["click"], "input, select, form"));
    this.registerDomEvent(this.containerEl, "change", act(["change"]));
    this.registerDomEvent(this.containerEl, "submit", act(["submit"]));
    // after leaving a field: a moment later, so a click on the widget's own button (which takes the focus) lands first
    this.registerDomEvent(this.containerEl, "focusout", () => { clearTimeout(this.leave); this.leave = setTimeout(() => this.catchUp(), 500); });

    const later = () => { clearTimeout(this.timer); this.timer = setTimeout(() => this.redraw(), DELAY); };
    this.registerEvent(this.app.metadataCache.on("dataview:metadata-change", later));
    this.registerEvent(this.app.metadataCache.on("changed", f => f.path === this.sourcePath && later()));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => this.catchUp()));
    this.registerEvent(this.app.workspace.on("layout-change", () => this.catchUp()));
    this.register(() => { clearTimeout(this.timer); clearTimeout(this.leave); this.drop(); });
    await this.draw();
  }

  // drawn now, or once it shows and nobody is typing in it
  redraw() {
    const busy = this.containerEl.contains(document.activeElement) && document.activeElement.matches("input, textarea, select");
    if (!this.containerEl.isShown() || busy) { this.stale = true; return; }
    this.draw();
  }
  catchUp() { if (this.stale) this.redraw(); }

  drop() { for (const k of this.kept.splice(0)) k?.destroy?.(); }

  async draw() {
    this.stale = false;
    const data = await this.data();
    this.drop();
    // what someone typed and hasn't saved stays: fields by their name get their text back
    const typed = [...this.containerEl.querySelectorAll("input[name], textarea[name]")].filter(f => f.value).map(f => [f.name, f.value]);
    const body = this.view(data), { card, meta } = this.args;
    const markup = card ? new Card({ title: String(card), meta: meta ? String(meta).split(/\s+/) : [], body }) : body;
    this.containerEl.replaceChildren(sanitizeHTMLToDom(markup.html));
    for (const [name, value] of typed) { const f = this.containerEl.querySelector(`[name="${CSS.escape(name)}"]`); if (f && !f.value) f.value = value; }
    // the widget's own place: inside the card when there is one
    const root = card ? this.containerEl.querySelector(":scope > .callout > .callout-content") : this.containerEl;
    await this.after(root, data);
  }
}
