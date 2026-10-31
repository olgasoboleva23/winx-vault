// Goals: per goal "X of Y this week", Mon–Sun dots, the minimum version, and how often it was done.
// A missed goal task stays on its day (the calendar's Missed? lists it).
import { html } from "../../ui/html.js";
import { Widget } from "../widget.js";
import { dm, pageDay, todayYmd, weekOf, ymd } from "../../core/dates.js";
import { Goal } from "./goal.js";

const GOALS_PATH = "02 Areas/Personal/Goals.md";

export class Goals extends Widget {
  async data() {
    if (!this.app.vault.getAbstractFileByPath(GOALS_PATH)) return { missing: true };
    const selected = ymd(pageDay(this.dv)), today = todayYmd();
    const goals = this.dv.pages('"02 Areas/Personal/Goals"').file.lists.map(i => Goal.parse(i.text)).where(Boolean).array();
    const tasks = this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks;
    return {
      selected, today, week: weekOf(selected),
      rows: goals.map(goal => ({ goal, done: tasks.where(t => t.completed && t.completion && t.tags.includes(goal.tag)).map(t => ymd(t.completion)).array() })),
    };
  }
  view({ missing, selected, today, week, rows }) {
    if (missing) return html`<div>Create ${GOALS_PATH}</div>`;
    return html`<div class="winx-goals">${rows.map(({ goal, done }) => {
      const doneSet = new Set(done), last = [...done].sort().at(-1);
      // "I've done this before": total and last time, from the ✅ dates already in the tasks
      const bits = [goal.min && `min: ${goal.min}`, done.length && `done ${done.length}× · last ${dm(last)}`].filter(Boolean);
      return html`<div class="winx-goal"${goal.plan ? html` title="${goal.plan}"` : ""}>
        <div class="winx-goal-head"><span class="winx-goal-name">${goal.name}</span><span class="winx-goal-count">${goal.doneIn(done, week)} of ${goal.weeklyTarget} this week</span></div>
        <div class="winx-goal-dots">${week.map(d => html`<span class="winx-dot ${goal.statusOn(d, doneSet, today)}${d === selected ? " sel" : ""}" title="${d}"></span>`)}</div>
        ${bits.length ? html`<div class="winx-goal-min">${bits.join("  ·  ")}</div>` : ""}
      </div>`;
    })}</div>`;
  }
}
