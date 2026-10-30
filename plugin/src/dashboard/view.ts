import { Component, ItemView, Keymap, MarkdownRenderer, WorkspaceLeaf } from "obsidian";
import layout from "./layout.md";
import { addDays, todayYmd } from "../lib/dates.js";

// The dashboard tab: layout.md (the grid of cards, its ```winx blocks and the Quests query) drawn by Obsidian's
// markdown renderer, as a note in reading view would be, for the tab's date. The date is the tab's own (no date:
// today, and it moves on at midnight); Obsidian saves it with the layout. After a write to the tasks or the data,
// the tab dims with the calendar's ✦ pill until a widget has drawn again (5 s at most).
export const DASHBOARD_VIEW = "winx-dashboard";
const WATCHED = ["02 Areas/Personal/Tasks/", "00 System/Data/"];
const QUIET = "00 System/Data/pomodoro.json";   // the timer saves itself all the time
// layout.md: the grid, then the Quests card's Tasks query (drawn into the card on its own: a new day redraws only it)
const [GRID, QUESTS] = layout.split(/\n%%.*%%\n/);

export class DashboardView extends ItemView {
  private date: string | null = null;
  private page: Component | null = null;
  private shownDate = "";
  private busyTimer = 0;
  private body: HTMLElement | null = null;

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
    this.contentEl.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard", "winx-dash"]);
    this.listen();
    this.render();
  }
  async onClose() { this.page?.unload(); this.page = null; }

  // another day: the cards draw again in place (the pomodoro isn't touched), the date row and Quests anew
  private go(date: string | null) {
    this.date = date === todayYmd() ? null : date;
    this.app.workspace.requestSaveLayout();
    if (!this.body) return this.render();
    this.shownDate = this.date ?? todayYmd();
    this.body.dataset.date = this.shownDate;
    this.dateRow();
    this.quests();
    this.app.workspace.trigger("winx:date");
  }

  private render() {
    const date = this.shownDate = this.date ?? todayYmd();
    if (this.page) this.removeChild(this.page);
    this.page = this.addChild(new Component());
    this.contentEl.empty();
    this.contentEl.removeClass("busy");
    this.contentEl.createDiv({ cls: "winx-cal-busy" }).createDiv({ cls: "winx-cal-busy-pill", attr: { title: "saving…" } }).createSpan({ text: "✦" });
    // the widgets' page date (Widget's dv.current())
    const body = this.body = this.contentEl.createDiv({ cls: "markdown-preview-sizer markdown-preview-section", attr: { "data-date": date } });
    MarkdownRenderer.render(this.app, GRID, body, "", this.page).then(() => {
      this.dateRow();
      this.quests();
    });
  }

  // the day it shows, where the note had the Meta Bind field: the calendar's date field, round ‹ ›, "today" pill
  private dateRow() {
    const slot = this.body?.querySelector(".winx-dash-date");
    if (!slot) return;
    slot.className = "winx-dash-date winx-cal-nav";
    slot.empty();
    slot.createDiv({ cls: "mb-input-type-date" }).createEl("input", { type: "date", value: this.shownDate, attr: { "data-action": "date" } });
    slot.createEl("button", { text: "‹", attr: { "aria-label": "previous", "data-action": "prev" } });
    slot.createEl("button", { text: "›", attr: { "aria-label": "next", "data-action": "next" } });
    if (this.shownDate !== todayYmd()) slot.createEl("button", { text: "today", cls: "winx-cal-today", attr: { "data-action": "today" } });
  }

  // Quests: the Tasks query of layout.md for the day, in its card (drawn on its own, so a new day redraws only it)
  private questsPart: Component | null = null;
  private quests() {
    const slot = this.body?.querySelector(".winx-dash-quests") as HTMLElement | null;
    if (!slot) return;
    if (this.questsPart) this.page!.removeChild(this.questsPart);
    this.questsPart = this.page!.addChild(new Component());
    slot.empty();
    MarkdownRenderer.render(this.app, QUESTS.replaceAll("{{date}}", this.shownDate), slot, "", this.questsPart);
  }

  private listen() {
    const el = this.contentEl;
    this.registerDomEvent(el, "change", e => {
      const t = e.target as HTMLInputElement;
      if (t.dataset.action === "date" && t.value) this.go(t.value);
    });
    this.registerDomEvent(el, "click", e => {
      const t = e.target as HTMLElement;
      const act = t.closest?.(".winx-dash-date [data-action]") as HTMLElement | null;
      if (act?.dataset.action === "prev") return this.go(addDays(this.shownDate, -1));
      if (act?.dataset.action === "next") return this.go(addDays(this.shownDate, 1));
      if (act?.dataset.action === "today") return this.go(null);
      // [[links]] in the layout open their note, as in a note (Cmd/Ctrl: a new tab)
      const link = t.closest?.("a.internal-link[data-href]") as HTMLAnchorElement | null;
      if (link) { e.preventDefault(); this.app.workspace.openLinkText(link.dataset.href!, "", Keymap.isModEvent(e)); }
    });
    // a write to the tasks or the data: dim with the ✦ pill until a widget draws again
    this.registerEvent(this.app.vault.on("modify", f => {
      if (f.path === QUIET || !WATCHED.some(d => f.path.startsWith(d))) return;
      el.addClass("busy");
      window.clearTimeout(this.busyTimer);
      this.busyTimer = window.setTimeout(() => el.removeClass("busy"), 5000);
    }));
    this.registerDomEvent(el, "winx-drawn" as any, () => window.setTimeout(() => el.removeClass("busy"), 200));
    // following today: a new day moves the dashboard on
    this.registerInterval(window.setInterval(() => { if (!this.date && this.shownDate !== todayYmd()) this.go(null); }, 60_000));
  }
}
