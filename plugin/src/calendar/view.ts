import { ItemView, Notice, WorkspaceLeaf, sanitizeHTMLToDom } from "obsidian";
import { POOL, TASKS } from "../core/paths.js";
import { useActions, useBusy, useDataviewChanges, useIndexReady, useNewDay, useRedraw } from "../core/use.js";
import { useDrag } from "./drag.js";
import { useSwipe } from "./swipe.js";
import { dataview, tasksApi } from "../core/plugins.js";
import { CalendarData, T, findTask, taskKey } from "./data.js";
import { baseDate, readState, shownDays } from "./state.js";
import { makeActions } from "./actions.js";
import { Grid, Header, Missed, Panel } from "./parts.js";
import config from "../core/config.js";
import { todayYmd } from "../core/dates.js";

// The calendar tab: the week (7 day columns) or the month around a date, the tasks of 00 System/Data/Tasks on
// their days, "Missed?" above, and the No date | Regulars | Pool panel below. Its state (date, view, tab, folds)
// is the tab's own: Obsidian saves it with the layout, so a pinned calendar comes back as it was.
// The parts are classes (parts.js): markup in html``, handlers by data-action. One set of listeners on the tab
// handles every click, tick, drag and swipe, and finds the task by the element's data-task key (file, line,
// status, words: the same task in every draw, never another one — see data.js).
// Parts redraw on their own: a tab or a fold the panel; a date, the week/month or ✓ done everything, from
// fresh data; a change to the tasks (Dataview's index) everything too.
export const VIEW_TYPE = "winx-calendar";
const TASKS_DIR = `${TASKS}/`;
type PartName = "header" | "missed" | "grid" | "panel";
const PARTS: PartName[] = ["header", "missed", "grid", "panel"];

export class CalendarView extends ItemView {
  private state = readState(undefined);
  private root!: HTMLElement;
  private els = new Map<PartName, Element[]>();
  private parts: Record<PartName, any> = { header: new Header(this), missed: new Missed(this), grid: new Grid(this), panel: new Panel(this) };
  ctx: any = null;
  actions: any = null;
  private catchUp = () => {};   // a hidden tab that missed changes, drawn when it shows (useRedraw)

  constructor(leaf: WorkspaceLeaf) { super(leaf); }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Calendar"; }
  getIcon() { return "calendar-days"; }

  getState() { return { ...this.state }; }
  async setState(saved: unknown, result: any) {
    this.state = readState(saved);
    await super.setState(saved, result);
    if (this.root) void this.draw();
  }

  async onOpen() {
    // a note in reading view (fonts, margins), with the dashboard pages' background and fonts on top
    this.contentEl.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard"]);
    this.root = this.contentEl.createDiv();
    this.listen();
    // now ("waiting…" until Dataview's index is built), and again each time it is
    void this.draw();
    useIndexReady(this, () => this.draw());
    // a task file changed in Dataview's index: new data, every part (a hidden tab waits until it shows)
    const { redraw, catchUp } = useRedraw(this, () => this.contentEl.isShown(), () => this.draw());
    this.catchUp = catchUp;
    useDataviewChanges(this, redraw, { watched: (path: string) => path.startsWith(TASKS_DIR), delay: 100 });
    // a write to a task file: the calendar dims with a spinning ✦ until the redraw
    useBusy(this, (path: string) => path.startsWith(TASKS_DIR), () => this.ctx?.root, "winx-cal--busy");
    // a new day: following today, the days move on; and "today" in every action is the new one
    useNewDay(this, redraw);
  }
  onResize() { this.catchUp(); }
  async onClose() { this.contentEl.empty(); this.ctx = null; }

  // what a component needs about a task, with its key (data-task)
  info(t: any) {
    const ctx = this.ctx, known = ctx.infos.get(t);
    if (known) return known;
    const task = T(t), key = taskKey(t), area = task.area;
    const i = {
      key, area: area?.slice(6) ?? null, difficulty: task.difficulty, text: task.text, pool: !!t.pool,
      label: `${ctx.config.areaIcons[area] ?? ""} ${task.text}`.trim(),
      stickers: task.stickers.map((name: string) => this.app.metadataCache.getFirstLinkpathDest(name, t.path)).filter(Boolean).map((f: any) => this.app.vault.getResourcePath(f)),
      canSkip: this.actions.canSkip(t),
    };
    ctx.infos.set(t, i);
    return i;
  }
  // the task an element stands for, in this draw's data; a task that's gone or changed meanwhile: none (and a notice)
  taskOf(el: Element) {
    const t = findTask((el.closest("[data-task]") as HTMLElement)?.dataset.task, this.ctx.model.all);
    if (!t) new Notice("✦ task changed, try again");
    return t;
  }

  area: string | null = null;   // the area tab picked over the week ("#area/body"): only its tasks shown; null: all

  // the whole calendar, with fresh data
  private async draw() {
    const dv: any = dataview();
    const say = (text: string) => { this.ctx = null; this.root.empty(); this.root.setText(text); };   // no calendar to redraw in place
    if (!dv) return say("✦ the calendar needs the Dataview plugin");
    if (!dv.index?.initialized) return say("✦ waiting for Dataview…");   // index-ready draws again
    const today = todayYmd(), days = shownDays(this.state, today);
    const tasks = dv.pages(`"${TASKS}"`).file.tasks.array();
    const poolLines = (dv.page(POOL)?.file.lists.array() ?? []).filter((l: any) => !l.task);
    // the data, all of it or one area's tasks and pool lines
    const data = (area: string | null) => new CalendarData({
      tasks: area ? tasks.filter((t: any) => T(t).area === area) : tasks,
      poolLines: area ? poolLines.filter((l: any) => l.text.includes(area)) : poolLines,
      days, today, areaOrder: Object.keys(config.areaIcons),
    });
    const old = this.ctx?.root;
    const root = createDiv({ cls: `winx-cal winx-cal--${this.state.view}` });
    const ctx: any = this.ctx = {
      root, state: this.state, today, days, base: baseDate(this.state, today), view: this.state.view,
      shown: { open: true, ghost: true, done: this.state.showDone },
      model: data(this.area),
      everything: this.area ? data(null) : null,   // the tabs' counts, whatever tab is picked
      config, TASKS: tasksApi(),
      infos: new Map(),
      unfolded: new Set(this.state.unfolded), shows: [], syncRepeats: () => {},
      saveUnfolded: () => { this.state.unfolded = [...ctx.unfolded]; this.app.workspace.requestSaveLayout(); },
      set: (patch: object, parts: PartName[]) => this.set(patch, parts),
    };
    this.actions = makeActions(ctx);
    this.els.clear();
    for (const p of PARTS) this.place(p, null);
    this.parts.header.mount(root);
    this.parts.grid.mount(root);
    if (old) old.replaceWith(root);
    else { this.root.empty(); this.root.appendChild(root); }   // first time: over "waiting…"
  }

  // a part's markup into the calendar, before `next` (or at the end)
  private place(p: PartName, next: Element | null) {
    const made = [...sanitizeHTMLToDom(this.parts[p].render().html).children];
    for (const e of made) this.ctx.root.insertBefore(e, next);
    this.els.set(p, made);
  }

  // a view change: the new state, saved with the layout, and only the parts it touches drawn again, in place.
  // The date, the week/month and ✓ done also change the days (and the data they need): those redraw from fresh data.
  private set(patch: object, parts: PartName[]) {
    Object.assign(this.state, patch);
    this.app.workspace.requestSaveLayout();
    if (parts.includes("grid")) return this.draw();
    for (const p of parts) {
      const next = PARTS.slice(PARTS.indexOf(p) + 1).map(q => this.els.get(q)?.[0]).find(Boolean) ?? null;   // what follows it
      this.els.get(p)?.forEach(e => e.remove());
      this.place(p, next);
    }
  }

  // ── the task's own buttons, the same in every part ──
  private ticks = new WeakMap<Element, number>();
  private taskOn: Record<string, (e: Event, el: HTMLElement) => any> = {
    edit: (e, el) => { const t = this.taskOf(el); if (t) this.actions.edit(t); },
    skip: (e, el) => { const t = this.taskOf(el); if (!t) return; el.closest("[data-task]")?.remove(); this.actions.skip(t); },
    // 🗑: the first click arms it for 3 s, the second removes the task's line (with undo)
    remove: async (e, el) => {
      if (!el.classList.contains("winx-task-btns__del--armed")) {
        el.classList.add("winx-task-btns__del--armed"); el.textContent = "✓?"; el.title = "Click again to delete";
        window.setTimeout(() => { el.classList.remove("winx-task-btns__del--armed"); el.textContent = "🗑"; el.title = "Delete task"; }, 3000);
        return;
      }
      const t = this.taskOf(el);
      if (!t) return;
      el.closest("[data-task]")?.remove();
      await this.actions.remove(t);
    },
    // a tick waits 2 s (struck through, a gold shimmer) before it's written: unticking in time leaves the file alone.
    // The sound comes from installSounds (it listens to every .task-list-item-checkbox)
    tick: (e, box) => {
      // the task as it is now: written 2 s later even if the calendar redraws meanwhile
      const row = box.closest(".winx-cal__task") as HTMLElement, cb = box as HTMLInputElement, t = this.taskOf(row);
      row.classList.toggle("winx-cal__task--ticking", cb.checked);
      window.clearTimeout(this.ticks.get(row));
      if (cb.checked && t) this.ticks.set(row, window.setTimeout(() => {
        cb.disabled = true; row.classList.add("winx-cal__task--done"); row.querySelector(".winx-task-btns")?.remove();
        this.actions.tick(t);
      }, 2000));
    },
  };

  // one set of listeners for the whole tab: actions, ticks (taskOn), drags (drag.js), swipes (swipe.js)
  private listen() {
    const el = this.contentEl;
    // an action: its part's handler, else the task's own (✏️ 🗑 ⏭ ⭐ ✓)
    useActions(this, el, (name: string, target: HTMLElement) => {
      if (!this.ctx) return null;
      const part = (target.closest("[data-part]") as HTMLElement)?.dataset.part as PartName;
      return this.parts[part]?.on[name] ?? this.taskOn[name];
    });
    useSwipe(this, useDrag(this));
  }
}
