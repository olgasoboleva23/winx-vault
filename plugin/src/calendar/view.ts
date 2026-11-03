import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { POOL, TASKS } from "../core/paths.js";
import { useActions, useBusy, useDataviewChanges, useIndexReady, useNewDay, useRedraw } from "../core/use.js";
import { createStore } from "../core/store.js";
import { app } from "../core/app.js";
import { dataview, tasksApi } from "../core/plugins.js";
import config from "../core/config.js";
import { todayYmd } from "../core/dates.js";
import { CalendarData, T, findTask, taskInfo } from "./data.js";
import { DATA, SAVED, baseDate, readState, shownDays } from "./state.js";
import { makeActions } from "./actions.js";
import { PartsLayout } from "./layout.js";
import { Header } from "./parts/header.js";
import { Missed } from "./parts/missed.js";
import { Grid } from "./parts/grid.js";
import { Panel } from "./parts/panel.js";
import { taskButtons } from "./taskButtons.js";
import { useDrag } from "./drag.js";
import { useSwipe } from "./swipe.js";

// The calendar tab: the week (7 day columns) or the month around a date, the tasks of 00 System/Data/Tasks on
// their days, "Missed?" above, and the No date | Ahead | Regulars | Pool panel below. Its state (date, view, tab,
// folds) is in a store (core/store.js) and saved with the layout, so a pinned calendar comes back as it was.
// The parts are classes (parts/): markup in html``, handlers by data-action; they change the state through the
// store and don't call each other. A change of the data's keys (state.js DATA) or of the tasks (Dataview's index)
// draws everything from fresh data; a key one part watches (the panel's tab) redraws that part in place.
// One set of listeners on the tab handles every click, tick (taskButtons.js), drag (drag.js) and swipe (swipe.js),
// and finds the task by the element's data-task key (file, line, status, words: never another one — see data.js).
export const VIEW_TYPE = "winx-calendar";
const TASKS_DIR = `${TASKS}/`;

export class CalendarView extends ItemView {
  store = createStore({ ...readState(undefined), area: null, picked: null },
    { save: () => this.app.workspace.requestSaveLayout(), saved: SAVED });
  parts: Record<string, any> = {
    header: new Header(this), missed: new Missed(this), grid: new Grid(this), panel: new Panel(this),
  };
  layout = new PartsLayout(this.parts);
  ctx: any = null;
  actions: any = null;
  private root!: HTMLElement;
  private catchUp = () => {};   // a hidden tab that missed changes, drawn when it shows (useRedraw)

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    this.store.watch(DATA, () => this.draw());
    for (const [name, part] of Object.entries(this.parts))
      if (part.constructor.watches.length)
        this.store.watch(part.constructor.watches, () => this.ctx && this.layout.redraw(name));
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Calendar"; }
  getIcon() { return "calendar-days"; }

  getState() { return Object.fromEntries(SAVED.map(k => [k, this.store.state[k]])); }
  async setState(saved: unknown, result: any) {
    Object.assign(this.store.state, readState(saved));
    await super.setState(saved, result);
    if (this.root) void this.draw();
  }

  async onOpen() {
    // a note in reading view (fonts, margins), with the dashboard pages' background and fonts on top
    this.contentEl.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard"]);
    this.root = this.contentEl.createDiv();
    // an action: its part's handler, else the task's own (✏️ 🗑 ⏭ ⭐ ✓)
    const buttons: Record<string, any> = taskButtons(this);
    const part = (target: HTMLElement) =>
      this.parts[(target.closest("[data-part]") as HTMLElement)?.dataset.part ?? ""];
    useActions(this, this.contentEl, (name: string, target: HTMLElement) =>
      this.ctx ? part(target)?.on[name] ?? buttons[name] : null);
    useSwipe(this, useDrag(this));
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

  info(t: any) { return taskInfo(t, this.ctx, app); }
  // the task an element stands for, in this draw's data; a task that's gone or changed meanwhile: none (and a notice)
  taskOf(el: Element) {
    const t = findTask((el.closest("[data-task]") as HTMLElement)?.dataset.task, this.ctx.model.all);
    if (!t) new Notice("✦ task changed, try again");
    return t;
  }

  // the whole calendar, with fresh data
  private async draw() {
    const dv: any = dataview();
    // no calendar to redraw in place
    const say = (text: string) => { this.ctx = null; this.root.empty(); this.root.setText(text); };
    if (!dv) return say("✦ the calendar needs the Dataview plugin");
    if (!dv.index?.initialized) return say("✦ waiting for Dataview…");   // index-ready draws again
    const state = this.store.state, today = todayYmd(), days = shownDays(state, today);
    const tasks = dv.pages(`"${TASKS}"`).file.tasks.array();
    const poolLines = (dv.page(POOL)?.file.lists.array() ?? []).filter((l: any) => !l.task);
    // the data, all of it or one area's tasks and pool lines
    const data = (area: string | null) => new CalendarData({
      tasks: area ? tasks.filter((t: any) => T(t).area === area) : tasks,
      poolLines: area ? poolLines.filter((l: any) => l.text.includes(area)) : poolLines,
      days, today, areaOrder: Object.keys(config.areaIcons),
    });
    const old = this.ctx?.root;
    const root = createDiv({ cls: `winx-cal winx-cal--${state.view}` });
    const ctx: any = this.ctx = {
      root, state, today, days, base: baseDate(state, today), view: state.view,
      shown: { open: true, ghost: true, done: state.showDone },
      model: data(state.area),
      everything: state.area ? data(null) : null,   // the tabs' counts, whatever tab is picked
      config, TASKS: tasksApi(),
      infos: new Map(),
      unfolded: new Set(state.unfolded), shows: [], syncRepeats: () => {},
      saveUnfolded: () => this.store.set({ unfolded: [...ctx.unfolded] }),
    };
    this.actions = ctx.actions = makeActions(ctx);
    this.layout.mount(root);
    this.parts.header.mount(root);
    this.parts.grid.mount(root);
    if (old) old.replaceWith(root);
    else { this.root.empty(); this.root.appendChild(root); }   // first time: over "waiting…"
  }
}
