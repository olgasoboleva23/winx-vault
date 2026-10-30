// The calendar's model, no DOM: tasks laid out on the shown days, the three bottom tabs (No date, Regulars,
// Pool) sorted, and their meta lines. Tasks are Dataview tasks ({ status, text, path, line }), each with its Task.
import { L } from "../lib/goalsLib.js";
import { Task } from "../lib/task.js";

export const T = t => (t.winxTask ??= Task.of(t));   // a Dataview task's Task, made once

const ORDER = { open: 0, ghost: 1, done: 2 };

// day → entries { t, kind: open | ghost | done }: open ones on their date (today and later; the overdue ones are
// in missed()), done ones on their ✅ date, a 🔁 task's next repeats faded (future days only).
// backlog: open one-offs with no date; regulars: open 🔁 tasks (an undated one is paused);
// pool: Pool.md's lines (no checkbox), each { text, path, line, pool: true } with its Task.
export function collect({ tasks, poolLines, days, today }) {
  const last = days.at(-1);
  const byDay = Object.fromEntries(days.map(d => [d, []]));
  const backlog = [];
  for (const t of tasks) {
    const task = T(t);
    if (task.isDone) { if (task.doneOn) byDay[task.doneOn]?.push({ t, kind: "done" }); continue; }
    if (!task.isOpen) continue;   // skipped, in progress etc.
    const d = task.date;
    if (!d) { if (!task.isRecurring) backlog.push(t); continue; }
    if (d >= today) byDay[d]?.push({ t, kind: "open" });
    if (task.rule) for (const g of L.projectRepeats(task.rule, d, last)) if (g > today) byDay[g]?.push({ t, kind: "ghost" });
  }
  for (const d of days) byDay[d].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]);
  const pool = poolLines.map(l => { const p = { text: l.text, path: l.path, line: l.line, pool: true }; p.winxTask = new Task(`- ${l.text}`, p); return p; });
  return {
    byDay, backlog, pool,
    regulars: tasks.filter(t => T(t).isOpen && T(t).isRecurring),
    done: tasks.map(T).filter(t => t.isDone && t.doneOn),
    skips: tasks.map(T).filter(t => t.isSkipped),
  };
}

// "Missed?": open tasks whose day has passed, the latest first
export const missed = (tasks, today) => tasks.filter(t => T(t).isOpen && T(t).date && T(t).date < today)
  .sort((a, b) => T(b).date.localeCompare(T(a).date));

// the place of a task's area in `areaOrder` (tags), unknown areas last
const rankBy = areaOrder => t => (i => i < 0 ? areaOrder.length : i)(areaOrder.indexOf(T(t).area));
const lastDone = (t, done) => T(t).history(done)?.last ?? "0000";

// No date: by area, then the longest waiting (➕ created) first
export const sortBacklog = (list, areaOrder) => {
  const rank = rankBy(areaOrder);
  return [...list].sort((a, b) => rank(a) - rank(b) || (T(a).created ?? "9").localeCompare(T(b).created ?? "9"));
};
// Pool: by area, then the longest since last done (never done first)
export const sortPool = (list, areaOrder, done) => {
  const rank = rankBy(areaOrder);
  return [...list].sort((a, b) => rank(a) - rank(b) || lastDone(a, done).localeCompare(lastDone(b, done)));
};
// Regulars: birthdays (a yearly rule) apart, by the next date; the rest by area, the most neglected first:
// dated before paused, the longest overdue, then the longest since last done
export const sortRegulars = (list, areaOrder, done, today) => {
  const rank = rankBy(areaOrder);
  const next = t => T(t).date;
  const late = t => next(t) && next(t) < today ? L.diffDays(today, next(t)) : -1;
  const bdays = list.filter(t => T(t).isBirthday).sort((a, b) => (next(a) ?? "9").localeCompare(next(b) ?? "9"));
  const rest = list.filter(t => !T(t).isBirthday)
    .sort((a, b) => rank(a) - rank(b) || !next(a) - !next(b) || late(b) - late(a) || lastDone(a, done).localeCompare(lastDone(b, done)));
  return { rest, bdays };
};

export const dm = d => `${d.slice(8, 10)}.${d.slice(5, 7)}`;   // "08.06"
const doneText = h => `done ${h.count}× · last ${dm(h.last)}`;

export const backlogMeta = (t, done, today) => {
  const created = T(t).created, h = T(t).history(done);
  return [created && `waiting ${L.diffDays(today, created)} d`, h && doneText(h)].filter(Boolean).join("  ·  ");
};
export const poolMeta = (t, done, today) => {
  const h = T(t).history(done);
  return h ? `${doneText(h)} · ${L.diffDays(today, h.last)} d ago` : "never done";
};
export const regularHistory = (t, done, skips) => {
  const h = T(t).history(done), s = T(t).history(skips);
  return [h ? doneText(h) : "never done", s && `skipped ${s.count}×`].filter(Boolean).join(" · ");
};

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
