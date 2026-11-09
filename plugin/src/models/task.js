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

const FIELD  = /\[(\w+):: ([^\]]*)\]/g;
const SPACED = new RegExp(`\\s*${FIELD.source}`, "g");   // a field with the spaces before it

// every [key:: value] of a line, by key
export const fieldsOf = line =>
  Object.fromEntries([...line.matchAll(FIELD)].map(m => [m[1], m[2]]));

// a line with one field set (replaced in place, or added at the end); null drops it
function withField(line, key, value) {
  const text = value === null ? "" : ` [${key}:: ${value}]`;
  let found = false;
  const out = line.replace(SPACED, (m, k) => k !== key || found ? m : (found = true, text));

  return found ? out : line.trimEnd() + text;
}

const dropFields = (line, keys) => keys.reduce((l, k) => withField(l, k, null), line);

const OPEN   = /^\s*- \[ \]/, ANY = /^\s*- \[.\]/, DONE = /^\s*- \[[xX]\]/;

const ID = /^t\d+(?=\s|$)/;   // the line's first word

export class Task {
  constructor(line, src = null, rec = null) { this.line = line; this.src = src; this.rec = rec; }
  get fields()     { return fieldsOf(this.line); }
  // a pool item: its id, no checkbox
  static of(t) {
    return new Task(t.pool ? `- ${t.id}` : `- [${t.status}] ${t.text}`, t, t.rec ?? null);
  }

  get status()     { return this.line.match(/^\s*- \[(.)\]/)?.[1] ?? null; }
  get isOpen()     { return this.status === " "; }
  get isDone()     { return DONE.test(this.line); }
  get isSkipped()  { return this.status === "-"; }
  // its id: the first word of the line, "t12"
  get id()         { return this.words.match(ID)?.[0] ?? null; }
  get area()       { return this.rec?.area ?? null; }   // "body"
  get difficulty() { return this.rec?.difficulty ?? null; }
  // the id it follows
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
  get doneOn()     { return this.fields.completion ?? null; }
  get skippedOn()  { return this.fields.cancelled ?? null; }
  get created()    { return this.fields.created ?? null; }
  // a 🔁 task with its dates dropped
  get isPaused()   { return this.isOpen && this.isRecurring && !this.date; }
  // ⏭ this time: a dated open 🔁 task
  get canSkip()    { return this.isOpen && this.isRecurring && !!this.date; }
  // open, its day gone by
  isOverdue(today) { return this.isOpen && !!this.date && this.date < today; }
  // its sticker's file name, in a list
  get stickers()   { return this.rec?.sticker ? [this.rec.sticker] : []; }
  // its name: the record's, else the line's words (a line whose id has no record: the id)
  get text()       { return this.rec?.name ?? this.words; }
  // the line's words alone: no checkbox, sticker, tags, rule or date fields
  get words() {
    return this.line.replace(ANY, "").replace(/^\s*- /, "").replace(FIELD, "")
      .replace(/!\[\[[^\]]*\]\]/g, "").replace(/#[^\s]+/g, "").replace(/\s+/g, " ").trim();
  }
  // identity across copies (open, done, skipped) of the same task, for history and for finding its
  // line again: its id, else its words lowercased
  get key() { return this.id ?? this.words.toLowerCase(); }
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
    if (!OPEN.test(this.line)) return this.line;
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
      daytime: this.daytime, sticker: this.rec?.sticker ?? null,
    };
  }
  // the line with its id swapped for `name`: what the Tasks plugin's dialog shows and edits
  named(name) {
    return [`${this.line.match(/^\s*- \[.\]/)[0]} ${name}`, ...this.line.match(FIELD) ?? []]
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
  pause() { return dropFields(this.line, ["due", "scheduled", "start"]); }
  togglePause(today) { return this.isPaused ? this.resume(today) : this.pause(); }
  resume(today) { return withField(this.pause(), "due", this.firstDay(today) ?? today); }

  // ── the Tasks plugin's output of ticking a task today (the done line, plus the next copy of a 🔁
  // task) ── as if ticked on `date`: completion moves there, and a "when done" next copy moves back
  // with it
  static backdateDone(toggled, date, today) {
    const shift = diffDays(date, today);

    return toggled.split("\n").map(l =>
      DONE.test(l) ? new Task(l).place(date, true)
      : /when done/.test(l)
        ? l.replace(FIELD, (m, k, d) =>
          ["due", "scheduled", "start"].includes(k) ? `[${k}:: ${addDays(d, shift)}]` : m)
      : l).join("\n");
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
      const day = from && OPEN.test(l) && new Task(l).firstDay(from);

      return day ? new Task(l).setDue(day) : l;
    }).join("\n");
  }
}

// Every record of tasks.json (pool ones too) once, for the "New task" search: its name and picks,
// how many lines with its id are done and when last; by `areaOrder` (area keys, the rest after),
// then the most done and the most recent first.
export function taskChoices(tasks, records, areaOrder) {
  const done = {};

  for (const t of tasks) {
    if (!t.id || !t.isDone) continue;
    const c = done[t.id] ??= { done: 0, last: null };

    c.done++;
    if (!c.last || t.doneOn > c.last) c.last = t.doneOn;
  }

  const rank = area => areaOrder.indexOf(area) >>> 0;

  return [...records].map(([id, r]) => ({
    id, name: r.name ?? id, area: r.area ?? null,
    picks: new Task("", null, r).picks,
    done: done[id]?.done ?? 0, last: done[id]?.last ?? null,
  })).sort((a, b) => rank(a.area) - rank(b.area) || b.done - a.done
    || (b.last ?? "").localeCompare(a.last ?? ""));
}
