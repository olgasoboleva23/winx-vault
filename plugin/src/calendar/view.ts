import { ItemView, TAbstractFile, WorkspaceLeaf } from "obsidian";
import { H } from "../lib/helpers.js";
import { collect, missed } from "./data.js";
import { baseDate, readState, shownDays } from "./state.js";
import { makeActions } from "./actions.js";
import { makeDrag } from "./drag.js";
import { makeSwipe } from "./swipe.js";
import { makeCards } from "./card.js";
import { drawHeader } from "./header.js";
import { drawMissed } from "./missed.js";
import { drawGrid } from "./grid.js";
import { drawPanel } from "./panel.js";

// The calendar tab: the week (7 day columns) or the month around a date, the tasks of 02 Areas/Personal/Tasks on
// their days, "Missed?" above, and the No date | Regulars | Pool panel below. Its state (date, view, tab, folds)
// is the tab's own: Obsidian saves it with the layout, so a pinned calendar comes back as it was.
// Parts redraw on their own: a tab or a fold the panel, a date the header and the days; a change to the tasks
// (Dataview's index) all of them, with fresh data.
export const VIEW_TYPE = "winx-calendar";
const TASKS_DIR = "02 Areas/Personal/Tasks/";
const POOL = "02 Areas/Personal/Tasks/Pool.md";
type Part = "header" | "missed" | "grid" | "panel";
const PARTS: Part[] = ["header", "missed", "grid", "panel"];

export class CalendarView extends ItemView {
  private state = readState(undefined);
  private root!: HTMLElement;
  private parts = new Map<Part, HTMLElement[]>();
  private ctx: any = null;
  private stale = false;   // the tasks changed while the tab was hidden: redraw when it shows

  constructor(leaf: WorkspaceLeaf) { super(leaf); }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Calendar"; }
  getIcon() { return "calendar-days"; }

  getState() { return { ...this.state }; }
  async setState(saved: unknown, result: any) {
    this.state = readState(saved);
    await super.setState(saved, result);
    if (this.root) this.draw();
  }

  async onOpen() {
    // a note in reading view (fonts, margins), with the dashboard pages' background and fonts on top
    this.contentEl.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard", "winx-cal-view"]);
    this.root = this.contentEl.createEl("div");
    const dv = this.dataview();
    // a cold start: Dataview may not have read the vault yet
    if (dv && !dv.index?.initialized) await new Promise<void>(done => {
      const ref = this.app.metadataCache.on("dataview:index-ready" as any, () => { this.app.metadataCache.offref(ref); done(); });
      this.registerEvent(ref);
    });
    this.draw();
    // a task file changed in Dataview's index: new data, every part (a hidden tab waits until it shows)
    let timer = 0;
    this.registerEvent((this.app.metadataCache as any).on("dataview:metadata-change", (_type: string, file: TAbstractFile) => {
      if (!file?.path?.startsWith(TASKS_DIR)) return;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => this.contentEl.isShown() ? this.draw() : (this.stale = true), 100);
    }));
    // a write to a task file: the calendar dims with a spinning ✦ until the redraw; 5 s at most
    this.registerEvent(this.app.vault.on("modify", f => {
      if (!f.path.startsWith(TASKS_DIR)) return;
      this.ctx?.root.classList.add("busy");
      window.setTimeout(() => this.ctx?.root.classList.remove("busy"), 5000);
    }));
    this.registerEvent(this.app.workspace.on("active-leaf-change", () => { if (this.stale && this.contentEl.isShown()) this.draw(); }));
  }
  async onClose() { this.contentEl.empty(); this.ctx = null; }

  private dataview(): any { return (this.app as any).plugins.plugins.dataview?.api; }

  // the whole calendar, with fresh data
  private async draw() {
    this.stale = false;
    const dv = this.dataview();
    if (!dv) { this.root.empty(); this.root.setText("✦ the calendar needs the Dataview plugin"); return; }
    const today = H.today(), days = shownDays(this.state, today);
    const tasks = dv.pages(`"${TASKS_DIR.slice(0, -1)}"`).file.tasks.array();
    const poolLines = (dv.page(POOL)?.file.lists.array() ?? []).filter((l: any) => !l.task);
    const config = await H.loadConfig();
    const old = this.ctx?.root;
    const root = createDiv({ cls: `winx-cal ${this.state.view}` });
    const ctx: any = this.ctx = {
      root, state: this.state, today, days, base: baseDate(this.state, today), view: this.state.view,
      shown: { open: true, ghost: true, done: this.state.showDone },
      model: collect({ tasks, poolLines, days, today }), missed: missed(tasks, today),
      config, TASKS: (this.app as any).plugins.plugins["obsidian-tasks-plugin"]?.apiV1,
      unfolded: new Set(this.state.unfolded), shows: [], syncRepeats: () => {},
      saveUnfolded: () => { this.state.unfolded = [...ctx.unfolded]; this.app.workspace.requestSaveLayout(); },
      set: (patch: object, parts: Part[]) => this.set(patch, parts),
    };
    ctx.actions = makeActions(ctx);
    ctx.drag = makeDrag(ctx, ctx.actions);
    ctx.cards = makeCards(ctx, ctx.actions, ctx.drag, makeSwipe(ctx.actions));
    ctx.swipe = makeSwipe(ctx.actions);
    this.parts.clear();
    for (const p of PARTS) this.parts.set(p, this.drawPart(p));
    old ? old.replaceWith(root) : this.root.appendChild(root);
  }

  private drawPart(p: Part): HTMLElement[] {
    const c = this.ctx;
    if (p === "header") return drawHeader(c, c.drag);
    if (p === "missed") return drawMissed(c, c.actions, c.drag, c.cards, c.swipe);
    if (p === "grid")   return drawGrid(c, c.drag, c.cards);
    return drawPanel(c, c.actions, c.drag, c.cards);
  }

  // a view change: the new state, saved with the layout, and only the parts it touches drawn again, in place.
  // The date, the week/month and ✓ done also change the days (and the data they need): those redraw from fresh data.
  private set(patch: object, parts: Part[]) {
    Object.assign(this.state, patch);
    this.app.workspace.requestSaveLayout();
    if (parts.includes("grid")) return this.draw();
    for (const p of parts) {
      const olds = this.parts.get(p) ?? [];
      const next = PARTS.slice(PARTS.indexOf(p) + 1).map(q => this.parts.get(q)?.[0]).find(Boolean);   // what follows it
      olds.forEach(e => e.remove());
      const made = this.drawPart(p);   // appended at the end of root…
      if (next) made.forEach(e => this.ctx.root.insertBefore(e, next));   // …and moved back in its place
      this.parts.set(p, made);
    }
  }
}
