// Goals: per goal "X of Y this week", Mon–Sun dots, the minimum version, and how often it was done.
// A missed goal task stays on its day (the calendar's Missed? lists it).
import { bem, html } from "../../core/html.js";
import { Widget } from "../widget.js";
import { dm, pageDay, todayYmd, weekOf, ymd } from "../../core/dates.js";
import { Goal } from "./goal.js";
import { Missing } from "../../uikit/empty.js";
import { GOALS, TASKS } from "../../core/paths.js";

export class Goals extends Widget {
  async data() {
    if (!this.app.vault.getAbstractFileByPath(`${GOALS}.md`)) return { missing: true };
    const selected = ymd(pageDay(this.dv)), today = todayYmd(), week = weekOf(selected);
    const goals = this.dv.pages(`"${GOALS}"`).file.lists.map(i => Goal.parse(i.text)).where(Boolean).array();
    const tasks = this.dv.pages(`"${TASKS}"`).file.tasks;
    return {
      goals: goals.map(goal => {
        const done = tasks.where(t => t.completed && t.completion && t.tags.includes(goal.tag))
          .map(t => ymd(t.completion)).array();
        const doneSet = new Set(done), last = [...done].sort().at(-1);
        // "I've done this before": total and last time, from the ✅ dates already in the tasks
        const bits = [goal.min && `min: ${goal.min}`,
          done.length && `done ${done.length}× · last ${dm(last)}`];
        return {
          name: goal.name, plan: goal.plan,
          count: `${goal.doneIn(done, week)} of ${goal.weeklyTarget}`,
          dots: week.map(day => ({
            day, status: goal.statusOn(day, doneSet, today), sel: day === selected,
          })),
          min: bits.filter(Boolean).join("  ·  "),
        };
      }),
    };
  }
  goal(g) {
    return html`<div class="winx-goal"${g.plan ? html` title="${g.plan}"` : ""}>
      <div class="winx-goal__head">
        <span class="winx-goal__name">${g.name}</span>
        <span class="winx-goal__count">${g.count} this week</span>
      </div>
      <div class="winx-goal__dots">${g.dots.map(d => this.dot(d))}</div>
      ${g.min ? html`<div class="winx-goal__min">${g.min}</div>` : ""}
    </div>`;
  }
  // a day of the week: done, missed, planned or none; the page's day ringed
  dot(d) {
    const cls = bem("winx-goal__dot", { [d.status]: true, sel: d.sel });
    return html`<span class="${cls}" title="${d.day}"></span>`;
  }
  view({ missing, goals }) {
    if (missing) return new Missing({ path: `${GOALS}.md` });
    return html`<div class="winx-goals">${goals.map(g => this.goal(g))}</div>`;
  }
}
