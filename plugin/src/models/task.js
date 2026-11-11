// One task: its line in the Tasks plugin's Dataview format (status, rule, dates) and Winx's own
// part, its record in tasks.json (name, difficulty, area, daytime, goal, sticker, after),
// found by the line's id. What it is (getters) and how to change its line (methods that return
// the new line; widgets write it). The only place that knows the format:
//   - [ ] / [x] done / [-] skipped · t12 (its id: the record's key)
//   fields [key:: value]: repeat (the rule, up to its ]) · due · scheduled (wins over due) · start
//   · completion · cancelled · created
// No Obsidian globals (tested by tests/task.test.mjs).
// Wrap a store item ({ text, status, rec }, or a pool item { id, pool: true, rec }) with Task.of(t)
// (t is kept as .src, for its path and line) or a raw line with new Task(line, null, rec).
// A pool item is a record with pool: true, no line; its copies on the days are ordinary tasks with
// its id.
import { addDays, diffDays } from "#/helpers/dates.js";
import { projectRepeats } from "./repeats.js";
import { ANY, FIELD, LineItem, lineOf, withField } from "./lineItem.js";

// the fields that put a task on a day
const DATES = ["due", "scheduled", "start"];

export class Task extends LineItem {
  static ID = /^t\d+(?=\s|$)/;   // the line's first word
  // a pool item: its id, no checkbox
  static of(t) { return new Task(t.pool ? `- ${t.id}` : lineOf(t), t, t.rec ?? null); }

  get isSkipped()  { return this.status === "-"; }
  get area()       { return this.rec?.area ?? null; }   // "body"
  get difficulty() { return this.rec?.difficulty ?? null; }
  // the id it follows, or several ids (whichever is present on the day)
  get after()      { return this.rec?.after ?? null; }
  // "morning" | "evening"
  get daytime()    { return this.rec?.daytime ?? null; }
  // the key of its goal in Goals.md ("workout")
  get goal()       { return this.rec?.goal ?? null; }
  get rule()       { return this.fields.repeat ?? null; }
  get isRecurring(){ return this.rule !== null; }
  get whenDone()   { return /when done$/.test(this.rule ?? ""); }
  get isBirthday() { return this.rule === "every year"; }
  get date()       { return this.fields.scheduled ?? this.fields.due ?? null; }   // the day it's on
  get skippedOn()  { return this.fields.cancelled ?? null; }
  get created()    { return this.fields.created ?? null; }
  // a 🔁 task with its dates dropped
  get isPaused()   { return this.isOpen && this.isRecurring && !this.date; }
  // ⏭ this time: a dated open 🔁 task
  get canSkip()    { return this.isOpen && this.isRecurring && !!this.date; }
  // open, its day gone by
  isOverdue(today) { return this.isOpen && !!this.date && this.date < today; }
  // its sticker's file name
  get sticker()    { return this.rec?.sticker ?? null; }
  get currVariant(){
    return this.variants.length ? this.rec?.currVariant ?? this.variants[0] : null;
  }
  get variants()   { return this.rec?.variants ?? []; }
  get text()       {
    return this.isOpen && this.currVariant ? `${this.name} · ${this.currVariant}` : this.name;
  }
  // a name compared with another: its words (not an id, even if it looks like one), lowercased
  static nameKey = name => new Task(`- [ ] ${name}`).words.toLowerCase();
  // a new open line: its text (an id, or a name for the Tasks dialog) and the day it was made
  static created = (text, today) => new Task(`- [ ] ${text} [created:: ${today}]`);
  // the same copy: its words, status and day (not its done copy, nor another day's)
  sameAs(other) {
    return this.key === other.key && this.status === other.status && this.date === other.date;
  }

  // ── edits: each returns the new line ──
  // set or clear the date of an open task: one date, due (an old scheduled goes)
  setDue(date) {
    if (!this.isOpen) return this.line;
    const base = withField(this.line, "scheduled", null);

    return withField(base, "due", date || null);
  }
  // put it on `date` as done (completion) or open and due that day (due, none for null). A 🔁
  // rule is left as is: no next copy is made here. To tick an open 🔁 task, go through the Tasks
  // plugin's toggle, then backdateDone.
  place(date, done) {
    if (!ANY.test(this.line)) return this.line;
    const base = withField(this.line, "completion", null)
      .replace(/^(\s*- \[)./, `$1${done ? "x" : " "}`);

    return done ? withField(base, "completion", date) : new Task(base).setDue(date);
  }
  // what the task window shows and sets: difficulty, area, daytime and the sticker
  get picks() {
    return {
      difficulty: this.difficulty, area: this.area,
      daytime: this.daytime, sticker: this.sticker,
      ...this.variants.length ? { variants: [...this.variants],
        currVariant: this.currVariant } : {},
    };
  }
  // the line with its id swapped for `name`: what the Tasks plugin's dialog shows and edits
  named(name) {
    const box = this.line.match(ANY)?.[0];

    if (!box) return this.line;   // no checkbox: nothing to name
    return [`${box} ${name}`, ...this.line.match(FIELD) ?? []]
      .join(" ");
  }
  // the dialog's result back: its words are the new name, the line gets `id` again (a 🔁 task
  // set to done there comes back as two lines, the next copy and the done one: each gets it)
  static unnamed(result, id) {
    const lines = result.split("\n").filter(l => ANY.test(l)).map(l => new Task(l));

    return { name: lines[0].words, line: lines.map(t => t.named(id)).join("\n") };
  }

  // the first day from `today` its rule allows: a weekday rule ("every week on Monday, …") its
  // next such day (today included), an interval rule ("every 3 days [when done]") today, any
  // other (the 1st, a year) none: the rule's own next is right
  firstDay(today) {
    const rule = this.rule ?? "";

    if (/^every (\d+ )?weeks? on /i.test(rule))
      return projectRepeats(rule, addDays(today, -1), addDays(today, 30))[0] ?? today;
    return /^every (\d+ )?(day|week|month)s?( when done)?$/i.test(rule) ? today : null;
  }
  // pause: drop its scheduled, due and start dates (it leaves the calendar). Resume: due on the
  // first day from today its rule allows (firstDay; none: today. ponytail: "every month on the
  // 1st" resumes today too)
  pause() { return DATES.reduce((l, k) => withField(l, k, null), this.line); }
  togglePause(today) { return this.isPaused ? this.resume(today) : this.pause(); }
  resume(today) { return withField(this.pause(), "due", this.firstDay(today) ?? today); }

  // ── the Tasks plugin's output of ticking a task today (the done line, plus the next copy of a 🔁
  // task) ── as if ticked on `date`: completion moves there, and a "when done" next copy moves back
  // with it
  static backdateDone(toggled, date, today) {
    const shift = diffDays(date, today);

    return toggled.split("\n").map(l => {
      const task = new Task(l);

      if (task.isDone) return task.place(date, true);
      if (!task.isOpen || !task.whenDone) return l;
      // A weekly weekday rule must stay on those weekdays when completion is backdated.
      // Shift start/scheduled/due together so their relative distances are retained.
      const weekday = /^every week on /i.test(task.rule) && task.date;
      const delta = weekday ? diffDays(task.firstDay(addDays(date, 1)), task.date) : shift;

      return l.replace(FIELD, (m, k, d) =>
        DATES.includes(k) ? `[${k}:: ${addDays(d, delta)}]` : m);
    }).join("\n");
  }
  // as a skip of this time: the done line turns cancelled ("- [-] … [cancelled:: date]"),
  // so the rule
  // moves on but nothing counts as done. `from` (today, for a missed copy): the next copy is due
  // on the first day from it the rule allows, not the one after the missed date (could be in the
  // past)
  static skipLines(toggled, from = null) {
    return toggled.split("\n").map(l => {
      if (/^\s*- \[x\]/.test(l))
        return l.replace(/^(\s*- \[)x/, "$1-").replace("[completion:: ", "[cancelled:: ");
      const day = from && new Task(l).isOpen && new Task(l).firstDay(from);

      return day ? new Task(l).setDue(day) : l;
    }).join("\n");
  }
}

// { count, last } by task key over `list` (Tasks): done copies by their completion date, skipped by
// their cancelled one
export const historyOf = list => {
  const by = new Map();

  for (const t of list) {
    const h = by.get(t.key) ?? { count: 0, last: "" }, on = t.doneOn ?? t.skippedOn ?? "";

    by.set(t.key, { count: h.count + 1, last: on > h.last ? on : h.last });
  }

  return by;
};

// Every record of tasks.json (pool ones too) once, for the "New task" search: its name and picks,
// how many lines with its id are done and when last; by `areaOrder` (area keys, the rest after),
// then the most done and the most recent first.
export function taskChoices(tasks, records, areaOrder) {
  const done = historyOf(tasks.filter(t => t.id && t.isDone));
  const rank = area => areaOrder.indexOf(area) >>> 0;

  return [...records].map(([id, r]) => ({
    id, name: r.name ?? id, area: r.area ?? null,
    picks: new Task("", null, r).picks,
    done: done.get(id)?.count ?? 0, last: done.get(id)?.last || null,
  })).sort((a, b) => rank(a.area) - rank(b.area) || b.done - a.done
    || (b.last ?? "").localeCompare(a.last ?? ""));
}

// A 🔁 task's variants in turn: the current one belongs to tasks.json. Tasks owns the lines,
// dates and recurrence; a completion with a generated next copy advances the JSON queue once.
// a record or a log the queue can't move on: shown to the user, nothing written
export class VariantProblem extends Error {}

export const variantNames = text => text.split("\n").map(s => s.trim()).filter(Boolean);

export function variantsProblem(variants, next) {
  if (!Array.isArray(variants) || variants.some(v => typeof v !== "string" || !v.trim()))
    return "Variant names must be non-empty text";
  if (new Set(variants.map(v => v.toLowerCase())).size !== variants.length)
    return "Each variant needs a different name";
  if (variants.length && !variants.includes(next)) return "Choose the next variant";
  return null;
}

export function nextVariantAfter(before, after, record, others = []) {
  const current = new Task(before);
  const variants = record?.variants ?? [];

  if (!variants.length || !current.isOpen || !after) return null;
  const lines = after.split("\n"), tasks = lines.map(l => new Task(l));
  const done = tasks.filter(t => t.id === current.id && t.isDone);
  const open = tasks.filter(t => t.id === current.id && t.isOpen && t.isRecurring);

  if (!done.length || !open.length) return null;
  const variant = record.currVariant ?? variants[0];
  const problem = variantsProblem(variants, variant);

  if (problem) throw new VariantProblem(problem);
  if (done.length !== 1 || open.length !== 1)
    throw new VariantProblem(`Ambiguous variant copies for ${current.id}`);
  if (others.some(l => {
    const t = new Task(l);

    return t.isOpen && t.id === current.id;
  })) throw new VariantProblem("Task has another open copy; resolve it before completing");
  return variants[(variants.indexOf(variant) + 1) % variants.length];
}
