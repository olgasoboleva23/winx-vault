// The calendar's model, no DOM (CalendarData), and the keys that name a task in its markup.
// Tasks are Dataview tasks ({ status, text, path, line }), each with its Task.
import { Task } from "../lib/task.js";
import { diffDays, dm } from "../lib/dates.js";
import { projectRepeats } from "../lib/repeats.js";

export const T = t => (t.winxTask ??= Task.of(t));   // a Dataview task's Task, made once

const ORDER = { open: 0, ghost: 1, done: 2 };
const doneText = h => `done ${h.count}× · last ${dm(h.last)}`;

// What the calendar shows, worked out once per draw from the tasks, Pool.md's lines, the shown days, today and
// the areas' order (tags; unknown areas last):
//   byDay    day → entries { t, kind: open | ghost | done }: open ones on their date (today and later; the
//            overdue ones are in missed), done ones on their ✅ date, a 🔁 task's next repeats faded (future days only)
//   missed   "Missed?": open tasks whose day has passed, the latest first
//   backlog  No date: open one-offs with no date, by area, then the longest waiting (➕ created) first
//   pool     Pool.md's lines (no checkbox), each { text, path, line, pool: true } with its Task: by area, then the
//            longest since last done (never done first)
//   regulars open 🔁 tasks (an undated one is paused): { rest, bdays } — birthdays (a yearly rule) apart, by the
//            next date; the rest by area, dated before paused, the longest overdue, then the longest since last done
//   all      every task and pool item: what a data-task key is looked up in
// and the meta lines of the bottom panel's cards.
export class CalendarData {
  constructor({ tasks, poolLines, days, today, areaOrder = [] }) {
    this.today = today;
    this.areaOrder = areaOrder;
    this.byDay = Object.fromEntries(days.map(d => [d, []]));
    const backlog = [], last = days.at(-1);
    for (const t of tasks) {
      const task = T(t);
      if (task.isDone) { if (task.doneOn) this.byDay[task.doneOn]?.push({ t, kind: "done" }); continue; }
      if (!task.isOpen) continue;   // skipped, in progress etc.
      const d = task.date;
      if (!d) { if (!task.isRecurring) backlog.push(t); continue; }
      if (d >= today) this.byDay[d]?.push({ t, kind: "open" });
      if (task.rule) for (const g of projectRepeats(task.rule, d, last)) if (g > today) this.byDay[g]?.push({ t, kind: "ghost" });
    }
    for (const d of days) this.byDay[d].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
    this.done = tasks.map(T).filter(t => t.isDone && t.doneOn);
    this.skips = tasks.map(T).filter(t => t.isSkipped);
    this.missed = tasks.filter(t => T(t).isOpen && T(t).date && T(t).date < today).sort((a, b) => T(b).date.localeCompare(T(a).date));
    const pool = poolLines.map(l => { const p = { text: l.text, path: l.path, line: l.line, pool: true }; p.winxTask = new Task(`- ${l.text}`, p); return p; });
    this.all = [...tasks, ...pool];
    this.backlog = backlog.sort((a, b) => this.rank(a) - this.rank(b) || (T(a).created ?? "9").localeCompare(T(b).created ?? "9"));
    this.pool = pool.sort((a, b) => this.rank(a) - this.rank(b) || this.lastDone(a).localeCompare(this.lastDone(b)));
    this.regulars = this.sortRegulars(tasks.filter(t => T(t).isOpen && T(t).isRecurring));
  }

  // the place of a task's area in the areas' order, unknown areas last
  rank(t) { const i = this.areaOrder.indexOf(T(t).area); return i < 0 ? this.areaOrder.length : i; }
  lastDone(t) { return T(t).history(this.done)?.last ?? "0000"; }
  sortRegulars(list) {
    const next = t => T(t).date, today = this.today;
    const late = t => next(t) && next(t) < today ? diffDays(today, next(t)) : -1;
    const bdays = list.filter(t => T(t).isBirthday).sort((a, b) => (next(a) ?? "9").localeCompare(next(b) ?? "9"));
    const rest = list.filter(t => !T(t).isBirthday)
      .sort((a, b) => this.rank(a) - this.rank(b) || !next(a) - !next(b) || late(b) - late(a) || this.lastDone(a).localeCompare(this.lastDone(b)));
    return { rest, bdays };
  }

  backlogMeta(t) {
    const created = T(t).created, h = T(t).history(this.done);
    return [created && `waiting ${diffDays(this.today, created)} d`, h && doneText(h)].filter(Boolean).join("  ·  ");
  }
  poolMeta(t) {
    const h = T(t).history(this.done);
    return h ? `${doneText(h)} · ${diffDays(this.today, h.last)} d ago` : "never done";
  }
  regularHistory(t) {
    const h = T(t).history(this.done), s = T(t).history(this.skips);
    return [h ? doneText(h) : "never done", s && `skipped ${s.count}×`].filter(Boolean).join(" · ");
  }
}

// A task's key in the calendar's markup (data-task): its file, line, status and words. It names the same task
// in every draw: findTask() takes the task at that line if it still has those words and that status, else the
// nearest one in the file that has them (lines move when a task is added on top), else none — never another task.
const words = t => t.pool ? Task.keyOf(`- ${t.text}`) : T(t).key;
const stateOf = t => t.pool ? "p" : t.status;
export const taskKey = t => [t.path, t.line, stateOf(t), words(t)].join("|");
export function findTask(key, tasks) {
  const [path, line, state, ...rest] = String(key).split("|");
  if (!rest.length) return null;
  const text = rest.join("|"), want = Number(line);
  const same = tasks.filter(t => t.path === path && stateOf(t) === state && words(t) === text);
  return same.sort((a, b) => Math.abs(a.line - want) - Math.abs(b.line - want))[0] ?? null;
}
