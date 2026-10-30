// Week (Week.md): goals × days with the cycle day as the last row, the tasks done and still open (Dataview's own
// task lists, ticks work), and each daily note's link with the first 3 lines under "## 📝 Notes".
import { MarkdownRenderer } from "obsidian";
import { H } from "../lib/helpers.js";
import { L } from "../lib/goalsLib.js";
import { html } from "../ui/html.js";
import { Widget } from "./widget.js";

const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
const label = d => `${DAYS[L.weekday(d) - 1]} ${d.slice(8, 10)}.${d.slice(5, 7)}`;

export class Week extends Widget {
  async data() {
    const selected = H.ymd(H.pageDay(this.dv)), today = H.today(), week = L.weekOf(selected);
    const tasks = this.dv.pages('"02 Areas/Personal/Tasks"').file.tasks;
    const goals = this.dv.pages('"02 Areas/Personal/Goals"').file.lists.map(i => L.parseGoal(i.text)).where(Boolean).array();
    const cyclePage = this.dv.page("02 Areas/Health & Body/Cycle.md");
    const dates = key => cyclePage?.file.lists.map(i => i.text.match(new RegExp(`${key}::\\s*(\\d{4}-\\d{2}-\\d{2})`))?.[1]).where(Boolean).array() ?? [];
    const starts = dates("start"), ends = dates("end");
    const plain = tasks.where(t => !t.tags.some(tag => tag.startsWith("#goal")));
    const notes = [];
    for (const p of this.dv.pages('"02 Areas/Personal/Daily Notes"').where(p => week.includes(H.ymd(p.date))).sort(p => p.date)) {
      const text = await this.app.vault.cachedRead(this.app.vault.getAbstractFileByPath(p.file.path));
      const lines = ((text.split(/^## 📝 Notes.*$/m)[1] ?? "").split(/^## /m)[0]).split("\n").map(s => s.trim()).filter(Boolean).slice(0, 3);
      notes.push(`${p.file.link} ${lines.join(" · ")}`);
    }
    return {
      week, today,
      goals: goals.map(goal => ({ goal, done: tasks.where(t => t.completed && t.completion && t.tags.includes(goal.tag)).map(t => H.ymd(t.completion)).array() })),
      cycle: starts.length ? week.map(d => L.cycleInfo(starts, d, cyclePage.period ?? 8, ends)) : null,
      doneByDay: week.map(d => [d, plain.where(t => t.completed && H.ymd(t.completion) === d)]).filter(([, ts]) => ts.length),
      notDone: plain.where(t => !t.completed && week.includes(H.ymd(t.due))),
      notes,
    };
  }
  view({ week, today, goals, cycle, doneByDay }) {
    return html`<table class="winx-week">
      <tr><th></th>${week.map(d => html`<th>${label(d)}</th>`)}<th></th></tr>
      ${goals.map(({ goal, done }) => { const doneSet = new Set(done); return html`<tr><td>${goal.name}</td>${week.map(d => html`<td><span class="winx-dot ${L.dayStatus(goal, d, doneSet, today)}"></span></td>`)}<td>${L.countDone(done, week)} of ${L.weeklyTarget(goal)}</td></tr>`; })}
      ${cycle ? html`<tr><td>cycle</td>${cycle.map(info => html`<td class="${info?.isPeriod ? "period" : ""}">${info ? String(info.day) : ""}</td>`)}<td></td></tr>` : ""}
    </table>
    ${goals.length ? "" : html`<div>Create 02 Areas/Personal/Goals.md</div>`}
    <h3>Done</h3>
    ${doneByDay.map(([d], i) => html`<div class="winx-week-day">${label(d)}</div><div data-slot="done-${i}"></div>`)}
    <h3>Not done</h3><div data-slot="notdone"></div>
    <h3>Notes</h3><div data-slot="notes"></div>`;
  }
  // what Dataview and Obsidian draw: the task lists (with working ticks) and the notes' links
  async after(root, { doneByDay, notDone, notes }) {
    const dv = this.dv.api, slot = name => root.querySelector(`[data-slot="${name}"]`);
    for (const [i, [, tasks]] of doneByDay.entries()) await dv.taskList(tasks, false, slot(`done-${i}`), this, this.sourcePath);
    await dv.taskList(notDone, false, slot("notdone"), this, this.sourcePath);
    for (const md of notes) await MarkdownRenderer.render(this.app, md, slot("notes").createDiv(), this.sourcePath, this);
  }
}
