// Run once at Obsidian startup (Templater startup template "_startup.md").
// Schedules today's macOS notifications from open tasks due today, plus a
// morning summary once a day. Reschedules when tasks or goals change and at midnight.
(async () => {
  const L     = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));
  const dv    = app.plugins.plugins.dataview?.api;
  const state = (app.__winxNotify ??= { timers: [], subscribed: false });
  if (!dv || app.isMobile || typeof Notification === "undefined") return;  // desktop only

  const today = () => window.moment().format("YYYY-MM-DD");
  const open  = () => dv.pages('"02 Areas/Personal/Tasks"').file.tasks.where(t => !t.completed && t.due);

  const notify = (title, body) => {
    const n = new Notification(title, { body, silent: false });
    state.shown = [...(state.shown ?? []).slice(-9), n];  // keep a reference, or Electron may drop the click
    n.onclick = () => {
      const w = require("electron").remote.getCurrentWindow();
      if (w.isMinimized()) w.restore();
      w.show(); w.focus();
      app.workspace.openLinkText("02 Areas/Personal/Tasks/Kanban", "", false);
    };
  };

  const schedule = () => {
    state.timers.forEach(clearTimeout);
    state.timers = [];
    const d     = today();
    const tasks = open().where(t => t.due.toFormat("yyyy-MM-dd") === d).array().map(t => ({ text: t.text, tags: t.tags }));
    const goals = dv.pages('"02 Areas/Personal/Goals"').file.lists.map(i => L.parseGoal(i.text)).where(Boolean).array();
    for (const r of L.reminders(tasks, goals)) {
      const ms = window.moment(`${d} ${r.at}`, "YYYY-MM-DD HH:mm").diff(window.moment());
      if (ms > 0) state.timers.push(setTimeout(() => notify(r.title, r.body), ms));
    }
    const midnight = window.moment().add(1, "day").startOf("day").add(1, "minute").diff(window.moment());
    state.timers.push(setTimeout(() => { summary(); schedule(); }, midnight));
  };

  const summary = () => {
    const d = today();
    try { if (localStorage.getItem("winx-notify-summary") === d) return; localStorage.setItem("winx-notify-summary", d); } catch {}
    const due     = open().where(t => t.due.toFormat("yyyy-MM-dd") === d).length;
    const overdue = open().where(t => t.due.toFormat("yyyy-MM-dd") < d && !t.tags.some(tag => tag.startsWith("#goal"))).length;
    notify(`✦ На сегодня ${due} задач`, overdue ? `Просрочено: ${overdue}` : "Просроченных нет");
  };

  const start = () => {
    summary();
    schedule();
    if (state.subscribed) return;
    state.subscribed = true;
    let debounce = null;
    app.metadataCache.on("changed", file => {
      if (!/^02 Areas\/Personal\/(Tasks|Goals)/.test(file.path)) return;
      clearTimeout(debounce);
      debounce = setTimeout(schedule, 2000);
    });
  };

  dv.index.initialized ? start() : app.metadataCache.on("dataview:index-ready", start);
})();
