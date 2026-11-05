import { Component, ItemView, MarkdownRenderer, Platform, WorkspaceLeaf } from "obsidian";
import { h, reactive } from "vue";
import { useVueApp } from "#/composables/vueApp.ts";
import layout from "./layout.md";
import { todayYmd } from "#/helpers/dates.js";
import { useBusy, useNewDay, useNoteLinks } from "#/composables/use.js";
import { DATA } from "#/helpers/paths.js";
import DashboardDate from "./DashboardDate.vue";

// The dashboard tab: layout.md (the grid of cards, its ```winx blocks and the Quests query) drawn
// by Obsidian's markdown renderer, as a note in reading view would be, for the tab's date. The date
// is the tab's own (no date: today, and it moves on at midnight); Obsidian saves it with the
// layout. After a write to the tasks or the data, the tab dims with the calendar's ✦ pill until a
// widget has drawn again (5 s at most).
export const DASHBOARD_VIEW = "winx-dashboard";
const WATCHED = [`${DATA}/`];
const QUIET = "00 System/Data/pomodoro.json";   // the timer saves itself all the time
// layout.md: the grid, then the Quests card's Tasks query (drawn into the card on its own: a new
// day redraws only it)
const [GRID, QUESTS] = layout.split(/\n%%.*%%\n/);

export class DashboardView extends ItemView {
  private date: string | null = null;
  private page: Component | null = null;
  private shownDate = "";
  private body: HTMLElement | null = null;
  private shown = reactive({ date: "", today: "" });

  constructor(leaf: WorkspaceLeaf) { super(leaf); }
  getViewType() { return DASHBOARD_VIEW; }
  getDisplayText() { return "Dashboard"; }
  getIcon() { return "sparkles"; }

  getState() { return { date: this.date }; }
  async setState(saved: any, result: any) {
    this.date = typeof saved?.date === "string" ? saved.date : null;
    await super.setState(saved, result);
    if (this.page) this.render();
  }

  async onOpen() {
    this.contentEl.addClasses(
      ["markdown-preview-view", "markdown-rendered", "dashboard", "winx-dash"],
    );
    this.listen();
    this.render();
  }
  async onClose() { this.page?.unload(); this.page = null; }

  // another day: the cards draw again in place (the pomodoro isn't touched), the date row and
  // Quests anew
  private go(date: string | null) {
    this.date = date === todayYmd() ? null : date;
    this.app.workspace.requestSaveLayout();
    if (!this.body) return this.render();
    this.shownDate = this.date ?? todayYmd();
    this.body.dataset.date = this.shownDate;
    Object.assign(this.shown, { date: this.shownDate, today: todayYmd() });
    this.quests();
    this.app.workspace.trigger("winx:date");
  }

  private render() {
    const date = this.shownDate = this.date ?? todayYmd();

    if (this.page) this.removeChild(this.page);
    const page = this.page = this.addChild(new Component());
    this.contentEl.empty();
    this.contentEl.removeClass("winx-dash--busy");
    // the ✦ pill, as the calendar's (CalendarHeader/index.vue), shown by the tab's --busy
    this.contentEl.createDiv({ cls: "winx-busy" })
      .createDiv({ cls: "winx-busy__pill", attr: { title: "saving…" } })
      .createSpan({ cls: "winx-busy__star", text: "✦" });
    // the widgets' page date (Widget's dv.current())
    const body = this.body = this.contentEl.createDiv({
      cls: "markdown-preview-sizer markdown-preview-section", attr: { "data-date": date },
    });
    void MarkdownRenderer.render(this.app, GRID, body, "", page).then(() => {
      if (this.page !== page) return;   // closed, or drawn again, meanwhile
      this.dateRow();
      this.quests();
    });
  }

  // the date row: DashboardDate.vue in the layout's slot (the calendar's date field, ‹ ›, today, 📅
  // on the phone)
  private dateRow() {
    const slot = this.body?.querySelector(".winx-dash__date");

    if (!slot) return;
    slot.className = "winx-dash__date winx-nav winx-row winx-gap-l";
    Object.assign(this.shown, { date: this.shownDate, today: todayYmd() });
    const { shown } = this, phone = Platform.isMobile;
    const go = (date: string | null) => this.go(date || null);
    const calendar = () => (this.app as any).commands.executeCommandById("winx:open-calendar");
    // a render function, so the row follows shown.date (props given to an app are read once)
    // owned by the page: gone with it when the dashboard draws again or closes
    useVueApp(this.page!, slot as HTMLElement, {
      render: () => h(DashboardDate, {
        date: shown.date, today: shown.today, phone, onGo: go, onCalendar: calendar,
      }),
    });
  }

  // Quests: the Tasks query of layout.md for the day, in its card (drawn on its own, so a new day
  // redraws only it)
  private questsPart: Component | null = null;
  private quests() {
    const slot = this.body?.querySelector(".winx-dash__quests") as HTMLElement | null;

    if (!slot) return;
    if (this.questsPart) this.page!.removeChild(this.questsPart);
    this.questsPart = this.page!.addChild(new Component());
    slot.empty();
    const query = QUESTS.replaceAll("{{date}}", this.shownDate);

    void MarkdownRenderer.render(this.app, query, slot, "", this.questsPart);
  }

  private listen() {
    const el = this.contentEl;
    useNoteLinks(this, el);   // [[links]] in the layout open their note
    // a write to the tasks or the data: dim with the ✦ pill until a widget draws again
    const watched = (path: string) => path !== QUIET && WATCHED.some(d => path.startsWith(d));

    useBusy(this, watched, () => el, "winx-dash--busy");
    this.registerDomEvent(el, "winx-drawn" as any,
      () => window.setTimeout(() => el.removeClass("winx-dash--busy"), 200));
    // following today: a new day moves the dashboard on
    useNewDay(this, () => { if (!this.date) this.go(null); });
  }
}
