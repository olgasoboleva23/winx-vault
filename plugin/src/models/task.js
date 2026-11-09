// One task line in the Tasks plugin's Dataview format: what it is (getters) and how to change it
// (methods that return the new line; widgets write it). The only place that knows the format:
//   - [ ] / [x] done / [-] skipped · #⭐… difficulty · #area/… · #time/morning|evening
//   · #id/<id> · #after/id/<id> · ![[sticker]]
//   fields [key:: value]: repeat (the rule, up to its ]) · due · scheduled (wins over due) · start
//   · completion · cancelled · created
// No Obsidian globals (tested by tests/task.test.mjs).
// Wrap a Dataview task (or a pool item, { text, pool: true }) with Task.of(t) (t is kept as .src,
// for its path and line) or a raw line with new Task(line).
// A pool line (Pool.md: a task to pick when it's time, "- #⭐easy #area/base take out trash") is the
// same without checkbox, rule or dates; its copies on the days are ordinary tasks with the same
// text.
import { addDays, diffDays } from "#/helpers/dates.js";
import { projectRepeats } from "./repeats.js";

const DATE   = "\\d{4}-\\d{2}-\\d{2}";
const FIELD  = /\[(\w+):: ([^\]]*)\]/g;

// every [key:: value] of a line, by key
export const fieldsOf = line =>
  Object.fromEntries([...line.matchAll(FIELD)].map(m => [m[1], m[2]]));

// a line with one field set (replaced in place, or added at the end); null drops it
export function withField(line, key, value) {
  const re = new RegExp(`\\s*\\[${key}:: [^\\]]*\\]`);
  const text = value === null ? "" : ` [${key}:: ${value}]`;

  return re.test(line) ? line.replace(re, text) : line.trimEnd() + text;
}

const dropFields = (line, keys) => keys.reduce((l, k) => withField(l, k, null), line);

const OPEN   = /^\s*- \[ \]/, ANY = /^\s*- \[.\]/, DONE = /^\s*- \[[xX]\]/;

export class Task {
  constructor(line, src = null) { this.line = line; this.src = src; }
  get fields()     { return fieldsOf(this.line); }
  // a pool item: no checkbox
  static of(t) { return new Task(t.pool ? `- ${t.text}` : `- [${t.status}] ${t.text}`, t); }

  get status()     { return this.line.match(/^\s*- \[(.)\]/)?.[1] ?? null; }
  get isOpen()     { return this.status === " "; }
  get isDone()     { return DONE.test(this.line); }
  get isSkipped()  { return this.status === "-"; }
  get tags()       { return this.line.match(/#[^\s#]+/gu) ?? []; }
  get area()       { return this.tags.find(t => t.startsWith("#area/")) ?? null; }   // "#area/body"
  get difficulty() { return this.tags.find(t => t.startsWith("#⭐")) ?? null; }
  // its id, for #after
  get id()         { return this.tags.find(t => t.startsWith("#id/"))?.slice(4) ?? null; }
  // the id it follows
  get after()      { return this.tags.find(t => t.startsWith("#after/id/"))?.slice(10) ?? null; }
  // "morning" | "evening"
  get time()       { return this.tags.find(t => t.startsWith("#time/"))?.slice(6) ?? null; }
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
  // file names of ![[x.png|28]]
  get stickers()   { return [...this.line.matchAll(/!\[\[([^\]|]+)/g)].map(m => m[1]); }
  // the words alone: no checkbox, sticker, tags, rule or date fields
  get text() {
    return this.line.replace(ANY, "").replace(/^\s*- /, "").replace(FIELD, "")
      .replace(/!\[\[[^\]]*\]\]/g, "").replace(/#[^\s]+/g, "").replace(/\s+/g, " ").trim();
  }
  // identity across copies (open, done, skipped) of the same task, for history and for finding its
  // line again
  get key() { return this.text.toLowerCase(); }
  static keyOf = line => new Task(line).key;
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
  // set or clear (null) a tag a line has once, by its prefix ("#area/", "#time/"): swapped in
  // place, or added after the tags that open the line
  setTag(prefix, tag) {
    const re = new RegExp(`(^|\\s)${prefix}\\S*`, "u");

    if (re.test(this.line)) return this.line.replace(re, tag ? `$1${tag}` : "");
    return tag ? this.line.replace(/^(\s*- \[.\](?:\s+#\S+)*)/u, `$1 ${tag}`) : this.line;
  }
  // the first sticker swapped for `name` (a file in the stickers folder) or dropped (null); without
  // one, it goes at the end of the text, before the rule and the date fields
  setSticker(name) {
    const re = /\s*!\[\[[^\]]*\]\]/;

    if (re.test(this.line)) return this.line.replace(re, name ? ` ![[${name}|28]]` : "");
    if (!name) return this.line;

    return this.line.replace(/\s*(?=\[\w+:: |$)/, ` ![[${name}|28]] `).trimEnd();
  }
  // what the task window shows and sets: difficulty, area, time ("#time/…") tags and the first
  // sticker
  get picks() {
    return {
      difficulty: this.difficulty, area: this.area,
      time: this.time && `#time/${this.time}`, sticker: this.stickers[0] ?? null,
    };
  }
  withPicks(p) {   // a key left out of p stays as it is
    let line = this.line;

    for (const [key, prefix] of [["difficulty", "#⭐"], ["area", "#area/"], ["time", "#time/"]])
      if (key in p) line = new Task(line).setTag(prefix, p[key]);
    return "sticker" in p ? new Task(line).setSticker(p.sticker) : line;
  }

  // as a pool line: no checkbox, rule or date fields
  get poolLine() {
    return this.line.replace(/^(\s*)- \[.\]\s*/, "$1- ").replace(/\s*\[\w+:: [^\]]*\]/g, "")
      .trimEnd();
  }
  // a pool line's new copy: an open task, created `today`
  static fromPool(line, today) {
    return `${line.trimEnd().replace(/^(\s*)- /, "$1- [ ] ")} [created:: ${today}]`;
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
        ? l.replace(new RegExp(`\\[(due|scheduled|start):: (${DATE})\\]`, "g"),
          (_, k, d) => `[${k}:: ${addDays(d, shift)}]`)
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

// Every task and pool line once, for the "New task" search: its latest spelling and picks, how many
// times it was done and when last; by `areaOrder` (["#area/…"], the rest after), then the most done
// and the most recent first.
export function taskChoices(lines, areaOrder) {
  const by = {};

  for (const t of lines.map(l => new Task(l)).filter(t => t.text)) {
    const when = t.doneOn ?? t.date ?? t.created ?? "";
    const c = by[t.key] ??= { done: 0, last: null, when: "" };

    if (t.isDone) { c.done++; if (!c.last || t.doneOn > c.last) c.last = t.doneOn; }

    if (when >= c.when) Object.assign(c, { when, name: t.text, area: t.area, picks: t.picks });
  }

  const rank = area => areaOrder.indexOf(area) >>> 0;

  return Object.values(by).map(({ when, ...c }) => c)
    .sort((a, b) => rank(a.area) - rank(b.area) || b.done - a.done
      || (b.last ?? "").localeCompare(a.last ?? ""));
}
