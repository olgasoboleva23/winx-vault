// The calendar's model, no DOM (CalendarData), and the keys that name a task in its markup.
// Tasks are Dataview tasks ({ status, text, path, line }), each with its Task.
import { Task } from "./task.js";
import { addDays, diffDays, dm, weekday } from "#/helpers/dates.js";
import { projectRepeats } from "./repeats.js";

export const T = t => (t.winxTask ??= Task.of(t));   // a Dataview task's Task, made once

const ORDER = { open: 0, ghost: 1, done: 2 };

// a day's group: one-offs, or a 🔁 task by its time of day (morning, evening, other)
export const dayGroup = t => !T(t).isRecurring ? "one"
  : ["morning", "evening"].includes(T(t).time) ? T(t).time : "other";

// the mark of a task's time of day, "" without one
export const timeMark = time => ({ morning: "🌅 ", evening: "🌙 " })[time] ?? "";

// morning → none → evening
export const timeRank = time => ["morning", null, "evening"].indexOf(time);
// a one-off's place by time; a 🔁 task keeps its box's groups, so counts as none
const slot = t => timeRank(T(t).isRecurring ? null : T(t).time);

// a task dragged onto another of its day: it moves before or after it only within its group and
// (the order is the record's), among its siblings (a subtask under its parent), and neither follows
// a lead (#after: it stays under it); both need an id
export const canReorder = (a, b) => a !== b && !!T(a).id && !!T(b).id && a.parent === b.parent
  && dayGroup(a) === dayGroup(b) && T(a).time === T(b).time && !T(a).after && !T(b).after;
// a task with #after/id/<id> right under the task with #id/<id> when both are in `list` (after its
// earlier followers), with .follows set to it; the rest in their order
const chain = list => {
  const lead = e => T(e.t).after && list.find(x => x !== e && T(x.t).id === T(e.t).after);
  const out = list.filter(e => !lead(e));

  for (const e of list.filter(lead)) {
    e.follows = lead(e);
    let i = out.indexOf(e.follows);

    while (out[i + 1]?.follows === e.follows) i++;
    out.splice(i + 1, 0, e);
  }

  return out;
};

const doneText = h => `done ${h.count}× · last ${dm(h.last)}`;

// { count, last } by task key over `list` (Tasks): done copies by their ✅ date, skipped by ❌
const historyOf = list => {
  const by = new Map();

  for (const t of list) {
    const h = by.get(t.key) ?? { count: 0, last: "" }, on = t.doneOn ?? t.skippedOn ?? "";

    by.set(t.key, { count: h.count + 1, last: on > h.last ? on : h.last });
  }

  return by;
};

// What the calendar shows, worked out once per draw from the tasks, the pool's records, the shown
// days, today and the areas' order (tags; unknown areas last):
//   byDay    day → entries { t, kind: open | ghost | done }: open ones on their date (today and
//            later; the overdue ones are in missed), done ones on their ✅ date, a 🔁 task's next
//            repeats faded (future days only)
//   missed   "Missed?": open tasks whose day has passed, the latest first
//   backlog  No date: open one-offs with no date, by area, then the longest waiting (➕ created)
//            first
//   pool     the pool's records, each { id, pool: true, rec, path } with its Task: by area, then
//            the longest since last done (never done first)
//   regulars open 🔁 tasks (an undated one is paused) but dated birthdays (a yearly rule, in Ahead):
//            by area, dated before paused, the longest overdue, then the longest since last done
//   ahead    open dated tasks (no 🔁, but birthdays) after today's week, by month:
//            [{ month: "2026-12", items }]; in a month by date, then area (the old Kanban's month /
//            year / future columns)
//   all      every task and pool item: what a row's key is looked up in
// and the meta lines of the bottom panel's cards.
export class CalendarData {
  /**
   * @param {{
   *   tasks: any[], poolLines: any[], days: string[], today: string, areaOrder?: string[]
   * }} args
   */
  constructor({ tasks, poolLines, days, today, areaOrder = [] }) {
    this.today = today;
    this.areaOrder = areaOrder;
    this.byDay = Object.fromEntries(days.map(d => [d, []]));
    const sunday = addDays(today, 7 - weekday(today));
    const backlog = [], ahead = [], last = days.at(-1);

    for (const t of tasks) {
      const task = T(t);

      if (task.isDone) {
        if (task.doneOn) this.byDay[task.doneOn]?.push({ t, kind: "done" });
        continue;
      }


      if (!task.isOpen) continue;   // skipped, in progress etc.
      const d = task.date;

      if (!d) { if (!task.isRecurring) backlog.push(t); continue; }

      if (d >= today) this.byDay[d]?.push({ t, kind: "open" });
      if ((!task.isRecurring || task.isBirthday) && d > sunday) ahead.push(t);
      if (task.rule)
        for (const g of projectRepeats(task.rule, d, last))
          if (g > today) this.byDay[g]?.push({ t, kind: "ghost" });
    }

    ahead.sort((a, b) => T(a).date.localeCompare(T(b).date) || this.rank(a) - this.rank(b));
    this.ahead = [];
    for (const t of ahead) {
      const month = T(t).date.slice(0, 7);

      if (this.ahead.at(-1)?.month !== month) this.ahead.push({ month, items: [] });
      this.ahead.at(-1).items.push(t);
    }

    for (const d of days) this.byDay[d].sort((a, b) => ORDER[a.kind] - ORDER[b.kind]
      || slot(a.t) - slot(b.t)
      || (T(a.t).rec?.order ?? Infinity) - (T(b.t).rec?.order ?? Infinity) || 0);
    this.doneBy = historyOf(tasks.map(T).filter(t => t.isDone && t.doneOn));
    this.skipsBy = historyOf(tasks.map(T).filter(t => t.isSkipped));
    this.missed = tasks.filter(t => T(t).isOverdue(today))
      .sort((a, b) => T(b).date.localeCompare(T(a).date));
    const pool = poolLines.map(({ id, rec, path }) => {
      const p = { id, pool: true, rec, path };
      p.winxTask = new Task(`- ${id}`, p, rec);
      return p;
    });
    this.all = [...tasks, ...pool];
    this.backlog = backlog.sort((a, b) =>
      this.rank(a) - this.rank(b) || (T(a).created ?? "9").localeCompare(T(b).created ?? "9"));
    this.pool = pool.sort((a, b) =>
      this.rank(a) - this.rank(b) || this.lastDone(a).localeCompare(this.lastDone(b)));
    this.regulars = this.sortRegulars(tasks.filter(t => T(t).isOpen && T(t).isRecurring));
  }

  // the week's balance: for each of `areas` (tags), its tasks on the shown days (open + done; a 🔁
  // task's faded repeats don't count) and how many of them are done
  balance(areas) {
    const entries = Object.values(this.byDay).flat().filter(e => e.kind !== "ghost");

    return areas.map(area => {
      const mine = entries.filter(e => T(e.t).area === area);

      return { area, planned: mine.length, done: mine.filter(e => e.kind === "done").length };
    });
  }

  // a day's entries by where they go: rows (not 🔁), the 🔁 box (all of them for its n/m pill;
  // routineRows listed in it) and the done ones `shown` hides, counted as ✓N: under the day, and
  // the 🔁 ones inside the box
  dayParts(d, shown) {
    const all = chain(this.byDay[d]), routine = all.filter(e => T(e.t).isRecurring);

    return {
      rows: all.filter(e => shown[e.kind] && !routine.includes(e)),
      routine, routineRows: routine.filter(e => shown[e.kind]),
      hidden: all.filter(e => !shown[e.kind] && e.kind === "done" && !routine.includes(e)),
      routineHidden: routine.filter(e => !shown[e.kind] && e.kind === "done"),
    };
  }

  // the place of a task's area in the areas' order, unknown areas last
  rank(t) {
    const i = this.areaOrder.indexOf(T(t).area);

    return i < 0 ? this.areaOrder.length : i;
  }

  lastDone(t) { return this.doneBy.get(T(t).key)?.last ?? "0000"; }
  sortRegulars(list) {
    const next = t => T(t).date, today = this.today;
    const late = t => next(t) && next(t) < today ? diffDays(today, next(t)) : -1;

    return list.filter(t => !(T(t).isBirthday && next(t)))
      .sort((a, b) => this.rank(a) - this.rank(b) || !next(a) - !next(b) || late(b) - late(a)
        || this.lastDone(a).localeCompare(this.lastDone(b)));
  }

  backlogMeta(t) {
    const created = T(t).created, h = this.doneBy.get(T(t).key);

    return [created && `waiting ${diffDays(this.today, created)} d`, h && doneText(h)]
      .filter(Boolean).join("  ·  ");
  }
  poolMeta(t) {
    const h = this.doneBy.get(T(t).key);

    return h ? `${doneText(h)} · ${diffDays(this.today, h.last)} d ago` : "never done";
  }
  regularHistory(t) {
    const h = this.doneBy.get(T(t).key), s = this.skipsBy.get(T(t).key);

    return [h ? doneText(h) : "never done", s && `skipped ${s.count}×`].filter(Boolean).join(" · ");
  }
}

// A task's key in the calendar's rows (TaskRow, TaskCard, Missed): its file, line, status and id
// (its words without one). It names the same task in every draw: findTask() takes the task at that
// line if it still has that id and that status, else the nearest one in the file that has them
// (lines move when a task is added on top), else none — never another task.
const words = t => T(t).key;
const stateOf = t => t.pool ? "p" : t.status;

export const taskKey = t => [t.path, t.line, stateOf(t), words(t)].join("|");

export function findTask(key, tasks) {
  const [path, line, state, ...rest] = String(key).split("|");

  if (!rest.length) return null;
  const text = rest.join("|"), want = Number(line);
  const same = tasks.filter(t => t.path === path && stateOf(t) === state && words(t) === text);

  return same.sort((a, b) => Math.abs(a.line - want) - Math.abs(b.line - want))[0] ?? null;
}

// what a part shows of a task, with its key; made once per draw (ctx.infos). `app`
// finds the stickers' pictures, ctx.actions whether it can be skipped
export function taskInfo(t, ctx, app) {
  const known = ctx.infos.get(t);

  if (known) return known;
  const task = T(t), area = task.area;
  const i = {
    key: taskKey(t), area: area?.slice(6) ?? null, difficulty: task.difficulty, text: task.text,
    pool: !!t.pool,
    time: task.isRecurring ? null : task.time,   // a 🔁 task's is its box heading's
    label: `${ctx.config.areaIcons[area] ?? ""} ${task.text}`.trim(),
    stickers: task.stickers.map(name => app.metadataCache.getFirstLinkpathDest(name, t.path))
      .filter(Boolean)
      .map(f => app.vault.getResourcePath(f)),
    canSkip: ctx.actions.canSkip(t),
  };
  ctx.infos.set(t, i);
  return i;
}
