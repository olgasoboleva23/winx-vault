import { ItemView, Notice, WorkspaceLeaf } from "obsidian";
import { computed, markRaw, reactive, ref, watch } from "vue";
import { useLater, useNewDay, useRedraw } from "#/composables/use.js";
import { app } from "#/helpers/app.js";
import { useVueApp } from "#/composables/vueApp.ts";
import { tasksApi } from "#/helpers/plugins.js";
import { taskStore } from "#/store/tasks.js";
import config from "#/helpers/config.js";
import { todayYmd } from "#/helpers/dates.js";
import { CalendarData, T, findTask, taskInfo } from "#/models/calendarData.js";
import { SAVED, baseDate, readState, shownDays } from "#/store/calendar.js";
import { makeActions } from "#/controllers/calendar.js";
import { dragState } from "#/composables/drag.js";
import CalendarTab from "./CalendarTab/index.vue";

// The calendar tab: the week (7 day columns) or the month around a date, the tasks of 00
// System/Data/Tasks on their days, "Missed?" above, and the No date | Ahead | Regulars | Pool panel
// below, drawn by Vue (CalendarTab.vue and its parts). Its state (date, view, tab, folds) is
// reactive and saved with the layout, so a pinned calendar comes back as it was. The data (ctx: the
// model, today, the shown days, the actions) is worked out again when a key it comes from changes
// (date, view, ✓ done, area) or the tasks do (store/tasks.js: a task file read again as soon as
// it's saved); the parts read what they show (the panel's tab, the folds, the phone's picked day)
// from the state, so a change there redraws only them. A row handles its own drags (drag.js) and
// swipes (swipe.js) and names its task by its key (file, line, status, words: never another one —
// see calendarData.js).
export const VIEW_TYPE = "winx-calendar";

export class CalendarView extends ItemView {
  // the saved keys (state.js) and the ones that aren't: area (one area's tasks only), picked (the
  // phone's day)
  state = reactive({
    ...readState(undefined), area: null as string | null, picked: null as string | null,
  });
  private version = ref(0);   // bumped when the tasks change: the data is worked out again
  private data = computed(() => { void this.version.value; return markRaw(this.build()); });
  private unmount = () => {};   // the calendar's Vue app (useVueApp), gone on close
  // the ticks waiting their 2 s (TaskRow): they outlive a redraw, not the tab
  waits = useLater(this);
  drag = dragState();   // what is dragged, from which day (drag.js): the rows and zones read it
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
    ({ unmount: this.unmount } = useVueApp(this, this.contentEl.createDiv(), CalendarTab, {
      provide: { calendar: this },
      onError: e => {
        console.error(e);
        new Notice(`Calendar: couldn't draw: ${e.message}`);
      },
    }));
    const reload = () => { this.version.value++; };

    // the tasks changed (a task file read again as soon as it's saved): new data (a hidden tab
    // waits until it shows)
    const { redraw, catchUp } = useRedraw(this, () => this.contentEl.isShown(), reload);
    this.catchUp = catchUp;
    this.register(watch(taskStore.version, redraw));
    // a new day: following today, the days move on; and "today" in every action is the new one
    useNewDay(this, redraw);
  }
  onResize() { this.catchUp(); }
  async onClose() { this.unmount(); this.contentEl.empty(); }

  info(t: any) { return taskInfo(t, this.ctx, app); }
  // the task a row's key stands for, in this data; a task that's gone or changed meanwhile:
  // none (a notice)
  task(key: string | undefined) {
    const t = this.ctx?.model && findTask(key, this.ctx.model.all);

    if (!t) new Notice("✦ task changed, try again");
    return t;
  }

  // the data the calendar shows, from the tasks as they are now
  private build() {
    if (!taskStore.ready) return { say: "✦ reading the tasks…" };   // the store's first read draws
    const { state } = this, today = todayYmd(), days = shownDays(state, today);
    const { tasks, pool: poolLines } = taskStore;
    // the data, all of it or one area's tasks and pool items
    const data = (area: string | null) => new CalendarData({
      tasks: area ? tasks.filter((t: any) => T(t).area === area) : tasks,
      poolLines: area ? poolLines.filter((l: any) => l.rec.area === area) : poolLines,
      days, today, areaOrder: Object.keys(config.areaIcons),
    });
    const ctx: any = {
      state, today, days, base: baseDate(state, today), view: state.view,
      shown: { open: true, ghost: true, done: state.showDone },
      model: data(state.area),
      everything: state.area ? data(null) : null,   // the tabs' counts, whatever tab is picked
      config, TASKS: tasksApi(), infos: new Map(),
    };
    ctx.actions = makeActions(ctx);
    return ctx;
  }
}
