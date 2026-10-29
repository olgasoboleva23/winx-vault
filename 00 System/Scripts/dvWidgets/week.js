const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));
const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));

const selected = H.ymd(H.pageDay(dv));
const today    = H.today();
const week     = L.weekOf(selected);
const DAYS     = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const label    = d => `${DAYS[L.weekday(d) - 1]} ${d.slice(8, 10)}.${d.slice(5, 7)}`;
const tasks    = dv.pages('"02 Areas/Personal/Tasks"').file.tasks;

// ── Goals × days, with the cycle day as the last row ──
const goals = dv.pages('"02 Areas/Personal/Goals"').file.lists.map(i => L.parseGoal(i.text)).where(Boolean).array();
const cyclePage = dv.page("02 Areas/Health & Body/Cycle.md");
const starts = cyclePage?.file.lists.map(i => i.text.match(/start::\s*(\d{4}-\d{2}-\d{2})/)?.[1]).where(Boolean).array() ?? [];
const ends   = cyclePage?.file.lists.map(i => i.text.match(/end::\s*(\d{4}-\d{2}-\d{2})/)?.[1]).where(Boolean).array() ?? [];

const table = dv.container.createEl("table", { cls: "winx-week" });
const head  = table.createEl("tr");
head.createEl("th");
for (const d of week) head.createEl("th", { text: label(d) });
head.createEl("th");

for (const goal of goals) {
  const done = tasks.where(t => t.completed && t.completion && t.tags.includes(goal.tag)).map(t => H.ymd(t.completion)).array();
  const doneSet = new Set(done);
  const tr = table.createEl("tr");
  tr.createEl("td", { text: goal.name });
  for (const d of week) tr.createEl("td").createEl("span", { cls: `winx-dot ${L.dayStatus(goal, d, doneSet, today)}` });
  tr.createEl("td", { text: `${L.countDone(done, week)} of ${L.weeklyTarget(goal)}` });
}

if (starts.length) {
  const tr = table.createEl("tr");
  tr.createEl("td", { text: "cycle" });
  for (const d of week) {
    const info = L.cycleInfo(starts, d, cyclePage.period ?? 8, ends);
    tr.createEl("td", { text: info ? String(info.day) : "", cls: info?.isPeriod ? "period" : "" });
  }
  tr.createEl("td");
}
if (!goals.length) dv.el("div", "Create 02 Areas/Personal/Goals.md");

// ── Tasks without #goal ──
const plain = tasks.where(t => !t.tags.some(tag => tag.startsWith("#goal")));
dv.header(3, "Done");
for (const d of week) {
  const doneOn = plain.where(t => t.completed && H.ymd(t.completion) === d);
  if (!doneOn.length) continue;
  dv.el("div", label(d), { cls: "winx-week-day" });
  dv.taskList(doneOn, false);
}
dv.header(3, "Not done");
dv.taskList(plain.where(t => !t.completed && week.includes(H.ymd(t.due))), false);

// ── Daily notes: link + first 3 lines under "## 📝 Notes" ──
dv.header(3, "Notes");
for (const p of dv.pages('"02 Areas/Personal/Daily Notes"').where(p => week.includes(H.ymd(p.date))).sort(p => p.date)) {
  const text  = await app.vault.cachedRead(app.vault.getAbstractFileByPath(p.file.path));
  const notes = (text.split(/^## 📝 Notes.*$/m)[1] ?? "").split(/^## /m)[0];
  const lines = notes.split("\n").map(s => s.trim()).filter(Boolean).slice(0, 3);
  dv.paragraph(`${p.file.link} ${lines.join(" · ")}`);
}
