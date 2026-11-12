import { Component, MarkdownRenderer, Platform } from "obsidian";
import { h, reactive, watch } from "vue";
import { useVueApp } from "#/composables/vueApp.ts";
import layout from "./layout.md";
import { app } from "#/helpers/app.js";
import { todayYmd } from "#/helpers/dates.js";
import { useBusy, useNewDay, useNoteLinks } from "#/composables/use.js";
import { DATA, POMODORO } from "#/helpers/paths.js";
import DashboardDate from "./DashboardDate.vue";

// The dashboard page: layout.md (the grid of cards, its ```winx blocks) drawn
// by Obsidian's markdown renderer, as a note in reading view would be, for the tab's date. The date
// is the tab's own (no date: today, and it moves on at midnight); Obsidian saves it with the
// layout. After a write to the tasks or the data, the tab dims with the calendar's ✦ pill until a
// widget has drawn again (5 s at most).
const WATCHED = [`${DATA}/`];
const QUIET = POMODORO;   // the timer saves itself all the time

type DashboardState = { date: string | null };

// The dashboard itself: layout.md drawn into `el` for state.date, its date row, its busy pill.
// The tab around it (or any owner) gives it the state and adds it as a child, so it all goes when
// the owner does.
export class DashboardPage extends Component {
  app = app;   // for the composables (useNoteLinks, useBusy: the workspace's and vault's events)
  state: DashboardState;
  private el: HTMLElement;
  private drawn: Component | null = null;   // the layout's markdown and date row, one per render
  private shownDate = "";
  private body: HTMLElement | null = null;
  private shown = reactive({ date: "", today: "" });

  constructor(state: DashboardState, el: HTMLElement) {
    super();
    this.state = state;
    this.el = el;
  }

  onload() {
    this.el.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard", "winx-dash"]);
    this.listen();
    this.render();
    // a date set from outside (the tab's Back / Forward); not the date row's own go()
    this.register(watch(() => this.state.date, d => {
      if ((d ?? todayYmd()) !== this.shownDate) this.go(d);
    }));
  }

  // another day: the cards draw again in place (the pomodoro isn't touched), the date row anew
  go(date: string | null) {
    this.state.date = date === todayYmd() ? null : date;
    if (!this.body) return this.render();
    this.shownDate = this.state.date ?? todayYmd();
    this.body.dataset.date = this.shownDate;
    Object.assign(this.shown, { date: this.shownDate, today: todayYmd() });
    this.app.workspace.trigger("winx:date");
  }

  render() {
    const date = this.shownDate = this.state.date ?? todayYmd();

    if (this.drawn) this.removeChild(this.drawn);
    const drawn = this.drawn = this.addChild(new Component());
    this.el.empty();
    this.el.removeClass("winx-dash--busy");
    // the ✦ pill, as the calendar's (CalendarHeader/index.vue), shown by the tab's --busy
    this.el.createDiv({ cls: "winx-busy" })
      .createDiv({ cls: "winx-busy__pill", attr: { title: "saving…" } })
      .createSpan({ cls: "winx-busy__star", text: "✦" });
    // the widgets' page date (Widget's dv.current())
    const body = this.body = this.el.createDiv({
      cls: "markdown-preview-sizer markdown-preview-section", attr: { "data-date": date },
    });
    void MarkdownRenderer.render(this.app, layout, body, "", drawn).then(() => {
      if (this.drawn !== drawn) return;   // closed, or drawn again, meanwhile
      this.dateRow();
    });
  }

  // the date row: DashboardDate.vue in the layout's slot (the calendar's date field, ‹ ›, today)
  private dateRow() {
    const slot = this.body?.querySelector(".winx-dash__date");

    if (!slot) return;
    slot.className = "winx-dash__date winx-nav winx-row winx-gap-l";
    Object.assign(this.shown, { date: this.shownDate, today: todayYmd() });
    const { shown } = this, phone = Platform.isMobile;
    const go = (date: string | null) => this.go(date || null);
    // a render function, so the row follows shown.date (props given to an app are read once)
    // owned by the render: gone with it when the dashboard draws again or closes
    useVueApp(this.drawn!, slot as HTMLElement, {
      render: () => h(DashboardDate, {
        date: shown.date, today: shown.today, phone, onGo: go,
      }),
    });
  }

  private listen() {
    const { el } = this;
    useNoteLinks(this, el);   // [[links]] in the layout open their note
    // a write to the tasks or the data: dim with the ✦ pill until a widget draws again
    const watched = (path: string) => path !== QUIET && WATCHED.some(d => path.startsWith(d));

    useBusy(this, watched, () => el, "winx-dash--busy");
    this.registerDomEvent(el, "winx-drawn" as any,
      () => window.setTimeout(() => el.removeClass("winx-dash--busy"), 200));
    // following today: a new day moves the dashboard on
    useNewDay(this, () => { if (!this.state.date) this.go(null); });
  }
}
