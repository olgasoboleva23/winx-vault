// Goals: per goal "X of Y this week", Mon–Sun dots, the minimum version, and how often it was done.
// It also moves a missed goal task (open, its date passed) to the goal's next planned day from today — see
// docs/dashboard.md. The rewrite only touches a line that still has the old date, so the redraw it causes
// changes nothing.
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

const GOALS_PATH = "02 Areas/Personal/Goals.md";

export class Goals extends Widget {
  async data() {
    if (!this.app.vault.getAbstractFileByPath(GOALS_PATH)) return { missing: true };
    const selected = H.ymd(H.pageDay(this.dv)), today = H.today();
    const goals = this.dv.pages('"02 Areas/Personal/Goals"').file.lists.map(i => L.parseGoal(i.text)).where(Boolean).array();
    const tasks = this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks;
    for (const goal of goals) await this.rollMissed(goal, tasks, today);
    return {
      selected, today, week: L.weekOf(selected),
      rows: goals.map(goal => ({ goal, done: tasks.where(t => t.completed && t.completion && t.tags.includes(goal.tag)).map(t => H.ymd(t.completion)).array() })),
    };
  }
  // a missed goal task: on to the next planned day ≥ today
  async rollMissed(goal, tasks, today) {
    for (const t of tasks.where(t => !t.completed && t.due && t.tags.includes(goal.tag))) {
      const due = H.ymd(t.due);
      if (due >= today) continue;
      const next = L.nextPlannedDate(goal, today);
      await this.app.vault.process(this.app.vault.getAbstractFileByPath(t.path), content => {
        const lines = content.split("\n");
        lines[t.line] = L.rollDue(lines[t.line], due, next);
        return lines.join("\n");
      });
    }
  }
  view({ missing, selected, today, week, rows }) {
    if (missing) return html`<div>Create ${GOALS_PATH}</div>`;
    return html`<div class="winx-goals">${rows.map(({ goal, done }) => {
      const doneSet = new Set(done), last = [...done].sort().at(-1);
      // "I've done this before": total and last time, from the ✅ dates already in the tasks
      const bits = [goal.min && `min: ${goal.min}`, done.length && `done ${done.length}× · last ${last.slice(8, 10)}.${last.slice(5, 7)}`].filter(Boolean);
      return html`<div class="winx-goal"${goal.plan ? html` title="${goal.plan}"` : ""}>
        <div class="winx-goal-head"><span class="winx-goal-name">${goal.name}</span><span class="winx-goal-count">${L.countDone(done, week)} of ${L.weeklyTarget(goal)} this week</span></div>
        <div class="winx-goal-dots">${week.map(d => html`<span class="winx-dot ${L.dayStatus(goal, d, doneSet, today)}${d === selected ? " sel" : ""}" title="${d}"></span>`)}</div>
        ${bits.length ? html`<div class="winx-goal-min">${bits.join("  ·  ")}</div>` : ""}
      </div>`;
    })}</div>`;
  }
}
