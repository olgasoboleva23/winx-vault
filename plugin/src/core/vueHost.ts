// The one place Vue meets Obsidian: a Component that owns a Vue app on a container. Its owner (a ```winx block,
// a tab) adds it as a child, so it goes when the owner goes. It holds the screen's state ({ data, loading,
// error }) and runs `load` now and again a moment after Dataview has a change (or the block's own note changes,
// or the dashboard's date); a hidden block once it shows. A load overtaken by a newer one, or ending after the
// block went, writes nothing; an error is shown with retry. On unload: Vue is unmounted.
// The .vue component gets `state` and `actions` (the screen's writes, and retry) as props; with `card` it is
// drawn inside a dashboard card (vue/WinxCard.vue).
import { Component } from "obsidian";
import { createApp, h, nextTick, reactive, type App, type Component as VueComponent } from "vue";
import { useDataviewChanges, useRedraw, useTabDate, useWhenIndexed } from "./use.js";
import { app } from "./app.js";
import WinxCard from "../vue/WinxCard.vue";
import WinxFailed from "../vue/WinxFailed.vue";

export interface HostOptions<D> {
  load: () => Promise<D>;
  actions?: Record<string, (...args: any[]) => unknown>;
  note?: string;                               // the block's own note: its changes count too
  card?: { title: string; meta?: string[] };   // drawn inside a dashboard card
}

export class VueHost<D = unknown> extends Component {
  app = app;
  state = reactive({ data: null as D | null, loading: true, error: null as string | null });
  private el: HTMLElement;
  private view: VueComponent;
  private opts: HostOptions<D>;
  private vue: App | null = null;
  private runs = 0;
  private gone = false;

  constructor(el: HTMLElement, view: VueComponent, opts: HostOptions<D>) {
    super();
    this.el = el;
    this.view = view;
    this.opts = opts;
  }

  onload() {
    const retry = () => void this.refresh(), { view, state, opts: { card } } = this;
    // actions only to a view that takes them (Vue would put an undeclared prop on its root as an attribute)
    const takes = "actions" in ((view as { props?: object }).props ?? {});
    const props = takes ? { state, actions: { ...this.opts.actions, retry } } : { state };
    // the error with retry, a card's shimmering placeholder until the first data, else the view
    const body = () => state.error ? h(WinxFailed, { text: state.error, onRetry: retry })
      : state.data === null ? (card ? h("div", { class: "winx-widget__skeleton" }) : null)
      : h(view, props);
    this.vue = createApp({ render: () => card ? h(WinxCard, card, body) : body() });
    this.vue.provide("sourcePath", this.opts.note ?? "");   // where a NoteLink opens a note from
    this.vue.mount(this.el);
    const { redraw } = useRedraw(this, () => this.shown, () => void this.refresh());
    useDataviewChanges(this, redraw, { note: this.opts.note, delay: 1000 });
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
      Object.assign(this.state, { data, error: null, loading: false });
      await nextTick();
      this.el.dispatchEvent(new CustomEvent("winx-drawn", { bubbles: true }));   // the dashboard's ✦ pill goes
    } catch (e) {
      if (this.gone || n !== this.runs) return;
      console.error(e);
      Object.assign(this.state, { error: (e as Error).message, loading: false });
    }
  }

  onunload() {
    this.gone = true;
    this.vue?.unmount();
    this.vue = null;
  }
}
