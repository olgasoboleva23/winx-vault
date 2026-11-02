import { Platform, debounce } from "obsidian";
import { dataview } from "../core/plugins.js";
import { useNewDay } from "../core/use.js";
import { todayYmd } from "../core/dates.js";
import { Goal, reminders } from "../widgets/goals/goal.js";
import { GOALS, TASKS } from "../core/paths.js";

// by name at run time, desktop only: a require("electron") in main.js would stop the phone loading it
const ELECTRON = "electron";

// Desktop notifications: today's reminders (goals.js reminders(): a goal task at its remind time, a task with
// "HH:MM" 30 minutes before) and a morning summary once a day. Rescheduled when tasks or goals change and on a new
// day. A click brings the window up and runs open() (the calendar).
export function useNotify(plugin, open) {
  if (Platform.isMobile || typeof Notification === "undefined") return;
  const { app } = plugin;
  let timers = [];
  const shown = [];   // a reference to each notification, or Electron may drop its click
  const clear = () => { timers.forEach(t => window.clearTimeout(t)); timers = []; };
  plugin.register(clear);

  const notify = (title, body) => {
    const n = new Notification(title, { body, silent: false });
    shown.push(n); shown.splice(0, shown.length - 10);
    n.onclick = () => {
      const w = window.require(ELECTRON).remote.getCurrentWindow();
      if (w.isMinimized()) w.restore();
      w.show(); w.focus(); open();
    };
  };
  const dueTasks = () => dataview().pages(`"${TASKS}"`).file.tasks.where(t => !t.completed && t.due);

  const schedule = () => {
    clear();
    const d = todayYmd();
    const tasks = dueTasks().where(t => t.due.toFormat("yyyy-MM-dd") === d).array().map(t => ({ text: t.text, tags: t.tags }));
    const goals = dataview().pages(`"${GOALS}"`).file.lists.map(i => Goal.parse(i.text)).where(Boolean).array();
    for (const r of reminders(tasks, goals)) {
      const ms = window.moment(`${d} ${r.at}`, "YYYY-MM-DD HH:mm").diff(window.moment());
      if (ms > 0) timers.push(window.setTimeout(() => notify(r.title, r.body), ms));
    }
  };
  // once a day per device
  const summary = () => {
    const d = todayYmd();
    if (app.loadLocalStorage("winx-notify-summary") === d) return;
    app.saveLocalStorage("winx-notify-summary", d);
    const due = dueTasks().where(t => t.due.toFormat("yyyy-MM-dd") === d).length;
    const overdue = dueTasks().where(t => t.due.toFormat("yyyy-MM-dd") < d && !t.tags.some(tag => tag.startsWith("#goal"))).length;
    notify(`✦ ${due} task${due === 1 ? "" : "s"} today`, overdue ? `Overdue: ${overdue}` : "Nothing overdue");
  };

  let started = false;
  const start = () => {
    if (started || !dataview()) return;
    started = true;
    summary(); schedule();
    const later = debounce(schedule, 2000, true);
    plugin.register(() => later.cancel());
    plugin.registerEvent(app.metadataCache.on("changed", f => { if (f.path.startsWith(TASKS) || f.path.startsWith(GOALS)) later(); }));
    useNewDay(plugin, () => { summary(); schedule(); });
  };
  // Dataview's index ready: now, or its event (at Obsidian's start Winx loads first)
  if (dataview()?.index.initialized) start();
  else plugin.registerEvent(app.metadataCache.on("dataview:index-ready", start));
}
