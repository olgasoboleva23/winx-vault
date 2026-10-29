// Mobile home: big tiles with live counts, each opens a mobile page.
const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));
const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
H.installSounds();
const Task = (app.__winxTask ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/task.js"))(L));

const today = H.today();
const wfile = app.vault.getAbstractFileByPath("02 Areas/Appearance/Weight.md");
const lastW = wfile ? L.parseWeights(await app.vault.cachedRead(wfile)).at(-1) : null;
const left  = dv.page("00 System/Data/Celestial Market")?.file.tasks.where(t => !t.completed).length ?? 0;
const tasks = dv.pages('"02 Areas/Personal/Tasks"').file.tasks.array()
  .map(t => ({ done: t.completed, recurring: Task.of(t).isRecurring, due: H.ymd(t.due), scheduled: H.ymd(t.scheduled) }));

const tiles = [
  { icon: "🛒", title: "Shopping", sub: `${left} left`, path: "Mobile/Shopping" },
  { icon: "☀️", title: "Tasks", sub: `${L.todayCount(tasks, today)} today`, path: "Mobile/Tasks" },
  { icon: "⚖️", title: "Weight", sub: lastW ? `${lastW.kg} kg` : "log", path: "Mobile/Weight" },
];

const grid = dv.container.createEl("div", { cls: "winx-tiles" });
for (const t of tiles) {
  const tile = grid.createEl("button", { cls: "winx-tile" });
  tile.createEl("div", { text: t.icon, cls: "winx-tile-icon" });
  tile.createEl("div", { text: t.title, cls: "winx-tile-title" });
  tile.createEl("div", { text: t.sub, cls: "winx-tile-sub" });
  tile.onclick = () => app.workspace.openLinkText(t.path, "", false);
}
