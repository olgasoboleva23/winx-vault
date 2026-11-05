// The one place Vue meets Obsidian: a ```winx block's MarkdownRenderChild that owns a Vue app on
// the block's container; the note adds it as a child, so it goes when the note's view goes.
// It holds the block's state ({ data, error }) and runs `load` now and again a moment after
// Dataview has a change (or the block's own note changes, or the dashboard's date); a hidden block
// once it shows. A load overtaken by a newer one, or ending after the block went, writes nothing;
// an error is shown with retry. On unload: Vue is unmounted. The .vue component gets `state` and
// `actions` (the block's writes, and retry) as props; with `card` it is drawn inside a dashboard
// card (components/uikit/WinxCard.vue).
import { MarkdownRenderChild } from "obsidian";
import { h, nextTick, reactive, type Component as VueComponent } from "vue";
import { useVueApp } from "./vueApp.ts";
import { useDataviewChanges, useRedraw, useTabDate, useWhenIndexed } from "./use.js";
import { app } from "../helpers/app.js";
import WinxCard from "../components/uikit/WinxCard/index.vue";
import WinxFailed from "../components/uikit/WinxFailed.vue";

export interface HostOptions<D> {
  load: () => Promise<D>;
  actions?: Record<string, (...args: any[]) => unknown>;
  note?: string;                               // the block's own note: its changes count too
  card?: { title: string; meta?: string[]; bodyClass?: string };   // drawn inside a dashboard card
  cardButton?: VueComponent;                   // a button next to the card's title (gets actions)
  // its files (a folder: ending in /): only their changes reload it; none given: any file's
  watches?: string[];
  follows?: boolean;   // false: loaded once (no vault data, like the pomodoro)
}

export class VueHost<D = unknown> extends MarkdownRenderChild {
  app = app;
  state = reactive({ data: null as D | null, error: null as string | null });
  private el: HTMLElement;
  private view: VueComponent;
  private opts: HostOptions<D>;
  private runs = 0;
  private gone = false;

  constructor(el: HTMLElement, view: VueComponent, opts: HostOptions<D>) {
    super(el);
    this.el = el;
    this.view = view;
    this.opts = opts;
  }

  onload() {
    const retry = () => void this.refresh(), { view, state, opts: { card } } = this;
    // actions only to a view that takes them (Vue would put an undeclared prop on its root as an
    // attribute)
    const takes = "actions" in ((view as { props?: object }).props ?? {});
    const props = takes ? { state, actions: { ...this.opts.actions, retry } } : { state };
    // the error with retry, a card's shimmering placeholder until the first data, else the view
    const body = () => state.error ? h(WinxFailed, { text: state.error, onRetry: retry })
      : state.data === null ? (card ? h("div", { class: "winx-widget__skeleton" }) : null)
      : h(view, props);
    const button = this.opts.cardButton, actions = { ...this.opts.actions, retry };
    const slots = { default: body, ...(button ? { button: () => h(button, { actions }) } : {}) };
    const root = { render: () => card ? h(WinxCard, card, slots) : body() };
    // where a NoteLink opens a note from; any error inside (a chart that fails): said, with retry
    useVueApp(this, this.el, root, {
      provide: { sourcePath: this.opts.note ?? "" },
      onError: e => {
        console.error(e);
        if (!this.gone) state.error = e.message;
      },
    });
    if (this.opts.follows === false) return void this.refresh();
    const { redraw } = useRedraw(this, () => this.shown, () => void this.refresh());
    const { watches } = this.opts;
    const watched = watches && ((path: string) =>
      watches.some(w => w.endsWith("/") ? path.startsWith(w) : path === w));

    useDataviewChanges(this, redraw, { watched, note: this.opts.note, delay: 1000 });
    useTabDate(this, this.el, () => void this.refresh());
    useWhenIndexed(this, () => void this.refresh());
  }

  // on screen: a card's block has no box of its own (display: contents), so ask what Vue put in it
  get shown() { return ((this.el.firstElementChild as HTMLElement | null) ?? this.el).isShown(); }

  async refresh() {
    const n = ++this.runs;

    try {
      const data = await this.opts.load();

      if (this.gone || n !== this.runs) return;   // closed, or a newer load is on its way
      Object.assign(this.state, { data, error: null });
      await nextTick();
      // the dashboard's ✦ pill goes
      this.el.dispatchEvent(new CustomEvent("winx-drawn", { bubbles: true }));
    } catch (e) {
      if (this.gone || n !== this.runs) return;
      console.error(e);
      Object.assign(this.state, { error: (e as Error).message });
    }
  }

  onunload() { this.gone = true; }   // the app itself goes with this component (useVueApp)
}
