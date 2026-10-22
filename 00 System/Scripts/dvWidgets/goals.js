const L = (app.__winxGoalsLib ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/goalsLib.js")));

const GOALS_PATH = "02 Areas/Personal/Goals.md";
if (!app.vault.getAbstractFileByPath(GOALS_PATH)) { dv.el("div", `Создай ${GOALS_PATH}`); return; }

const selected = (dv.current().date ?? dv.date("today")).toFormat("yyyy-MM-dd");
const today    = window.moment().format("YYYY-MM-DD");
const week     = L.weekOf(selected);
const goals    = dv.pages('"02 Areas/Personal/Goals"').file.lists.map(i => L.parseGoal(i.text)).where(Boolean).array();
const tasks    = dv.pages('"02 Areas/Personal/Tasks"').file.tasks;

// Roll overdue goal tasks to the next planned day ≥ today. Only rewrites a line that
// still carries the old date, so the re-render this triggers changes nothing.
for (const goal of goals) {
  for (const t of tasks.where(t => !t.completed && t.due && t.tags.includes(goal.tag))) {
    const due = t.due.toFormat("yyyy-MM-dd");
    if (due >= today) continue;
    const next = L.nextPlannedDate(goal, today);
    const file = app.vault.getAbstractFileByPath(t.path);
    await app.vault.process(file, content => {
      const lines = content.split("\n");
      lines[t.line] = L.rollDue(lines[t.line], due, next);
      return lines.join("\n");
    });
  }
}

const root = dv.container.createEl("div", { cls: "winx-goals" });
for (const goal of goals) {
  const done = tasks.where(t => t.completed && t.completion && t.tags.includes(goal.tag))
    .map(t => t.completion.toFormat("yyyy-MM-dd")).array();
  const doneSet = new Set(done);
  const row = root.createEl("div", { cls: "winx-goal", attr: goal.plan ? { title: goal.plan } : {} });
  const head = row.createEl("div", { cls: "winx-goal-head" });
  head.createEl("span", { text: goal.name, cls: "winx-goal-name" });
  head.createEl("span", { text: `${L.countDone(done, week)} из ${L.weeklyTarget(goal)} на этой неделе`, cls: "winx-goal-count" });
  const dots = row.createEl("div", { cls: "winx-goal-dots" });
  for (const d of week) {
    dots.createEl("span", { cls: `winx-dot ${L.dayStatus(goal, d, doneSet, today)}${d === selected ? " sel" : ""}`, attr: { title: d } });
  }
  if (goal.min) row.createEl("div", { text: `мин: ${goal.min}`, cls: "winx-goal-min" });
}
