import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import {
  computed, createApp, markRaw, nextTick, reactive, ref, watch, type App as VueApp,
} from "vue";
import { POOL, TASKS } from "../core/paths.js";
import { useBusy, useDataviewChanges, useIndexReady, useNewDay, useRedraw } from "../core/use.js";
import { app } from "../core/app.js";
import { dataview, tasksApi } from "../core/plugins.js";
import config from "../core/config.js";
import { todayYmd } from "../core/dates.js";
import { CalendarData, T, findTask, taskInfo } from "./data.js";
import { SAVED, baseDate, readState, shownDays } from "./state.js";
import { makeActions } from "../controllers/calendar.js";
import { useDrag } from "./drag.js";
import { useSwipe } from "./swipe.js";
import CalendarTab from "../components/calendar/CalendarTab.vue";

// The calendar tab: the week (7 day columns) or the month around a date, the tasks of 00
// System/Data/Tasks on their days, "Missed?" above, and the No date | Ahead | Regulars | Pool panel
// below, drawn by Vue (CalendarTab.vue and its parts). Its state (date, view, tab, folds) is
// reactive and saved with the layout, so a pinned calendar comes back as it was. The data (ctx: the
// model, today, the shown days, the actions) is worked out again when a key it comes from changes
// (date, view, ✓ done, area) or the tasks do (Dataview's index); the parts read what they show (the
// panel's tab, the folds, the phone's picked day) from the state, so a change there redraws only
// them. Drag (drag.js) and swipe (swipe.js) listen on the tab and find the task by the element's
// data-task key (file, line, status, words: never another one — see data.js).
export const VIEW_TYPE = "winx-calendar";
const TASKS_DIR = `${TASKS}/`;

export class CalendarView extends ItemView {
  // the saved keys (state.js) and the ones that aren't: area (one area's tasks only), picked (the
  // phone's day)
  state = reactive({
    ...readState(undefined), area: null as string | null, picked: null as string | null,
  });
  private version = ref(0);   // bumped when the tasks change: the data is worked out again
  private data = computed(() => { void this.version.value; return markRaw(this.build()); });
  private vue: VueApp | null = null;
  private catchUp = () => {};   // a hidden tab that missed changes, drawn when it shows (useRedraw)

  constructor(leaf: WorkspaceLeaf) {
    super(leaf);
    const saved = () => JSON.stringify(SAVED.map(k => (this.state as any)[k]));
    this.register(watch(saved, () => this.app.workspace.requestSaveLayout()));
  }
  getViewType() { return VIEW_TYPE; }
  getDisplayText() { return "Calendar"; }
  getIcon() { return "calendar-days"; }

  getState() { return Object.fromEntries(SAVED.map(k => [k, (this.state as any)[k]])); }
  async setState(saved: unknown, result: any) {
    Object.assign(this.state, readState(saved));
    await super.setState(saved, result);
  }

  // what the parts draw from ({ say } while there's nothing to draw)
  get ctx(): any { return this.data.value; }
  get actions(): any { return this.ctx?.actions ?? null; }

  async onOpen() {
    // a note in reading view (fonts, margins), with the dashboard pages' background and fonts on
    // top
    this.contentEl.addClasses(["markdown-preview-view", "markdown-rendered", "dashboard"]);
    this.vue = createApp(CalendarTab).provide("calendar", this);
    this.vue.mount(this.contentEl.createDiv());
    useSwipe(this, useDrag(this));
    const reload = () => { this.version.value++; };

    useIndexReady(this, reload);   // again each time Dataview's index is built
    // a task file changed in Dataview's index: new data (a hidden tab waits until it shows)
    const { redraw, catchUp } = useRedraw(this, () => this.contentEl.isShown(), reload);
    this.catchUp = catchUp;
    const tasksFile = (path: string) => path.startsWith(TASKS_DIR);

    useDataviewChanges(this, redraw, { watched: tasksFile, delay: 100 });
    // a write to a task file: the calendar dims with a spinning ✦ until the new data is drawn
    useBusy(this, tasksFile, () => this.ctx?.root, "winx-cal--busy");
    const unbusy = watch(this.data,
      () => void nextTick(() => this.ctx?.root?.classList.remove("winx-cal--busy")));
    this.register(unbusy);
    // a new day: following today, the days move on; and "today" in every action is the new one
    useNewDay(this, redraw);
  }
  onResize() { this.catchUp(); }
  async onClose() { this.vue?.unmount(); this.vue = null; this.contentEl.empty(); }

  info(t: any) { return taskInfo(t, this.ctx, app); }
  // the task a key (data-task) stands for, in this data; a task that's gone or changed meanwhile:
  // none (a notice)
  task(key: string | undefined) {
    const t = this.ctx?.model && findTask(key, this.ctx.model.all);

    if (!t) new Notice("✦ task changed, try again");
    return t;
  }
  taskOf(el: Element) {
    return this.task((el.closest("[data-task]") as HTMLElement)?.dataset.task);
  }

  // the data the calendar shows, from the tasks as they are now
  private build() {
    const dv: any = dataview();

    if (!dv) return { say: "✦ the calendar needs the Dataview plugin" };
    // index-ready loads again
    if (!dv.index?.initialized) return { say: "✦ waiting for Dataview…" };
    const { state } = this, today = todayYmd(), days = shownDays(state, today);
    const tasks = dv.pages(`"${TASKS}"`).file.tasks.array();
    const poolLines = (dv.page(POOL)?.file.lists.array() ?? []).filter((l: any) => !l.task);
    // the data, all of it or one area's tasks and pool lines
    const data = (area: string | null) => new CalendarData({
      tasks: area ? tasks.filter((t: any) => T(t).area === area) : tasks,
      poolLines: area ? poolLines.filter((l: any) => l.text.includes(area)) : poolLines,
      days, today, areaOrder: Object.keys(config.areaIcons),
    });
    const contentEl = this.contentEl;
    const ctx: any = {
      state, today, days, base: baseDate(state, today), view: state.view,
      shown: { open: true, ghost: true, done: state.showDone },
      model: data(state.area),
      everything: state.area ? data(null) : null,   // the tabs' counts, whatever tab is picked
      config, TASKS: tasksApi(), infos: new Map(),
      get root() { return contentEl.querySelector(".winx-cal"); },
    };
    ctx.actions = makeActions(ctx);
    return ctx;
  }
}
