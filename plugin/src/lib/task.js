// One task line in the Tasks plugin's emoji format: what it is (getters) and how to change it (methods that
// return the new line; widgets write it). The only place that knows the format:
//   - [ ] / [x] done / [-] skipped · #⭐… difficulty · #area/… · #time/morning|evening · ![[sticker]]
//   🔁 rule (up to the next field) · 📅 due (an old ⏳ still counts) · ✅ done · ❌ skipped · ➕ created · 🛫 start
// No Obsidian globals (tested by tests/task.test.mjs).
// Wrap a Dataview task with Task.of(t) (t is kept as .src, for its path and line) or a raw line with new Task(line).
// A pool line (Pool.md: a task to pick when it's time, "- #⭐easy #area/base take out trash") is the same without
// checkbox, rule or dates; its copies on the days are ordinary tasks with the same text.
import { addDays, diffDays } from "./dates.js";
import { projectRepeats } from "./repeats.js";

const DATE   = "\\d{4}-\\d{2}-\\d{2}";
const FIELDS = "📅⏳✅❌🛫➕";   // a date field starts with one of these; a 🔁 rule runs up to the next one
const field  = (line, emoji) => line.match(new RegExp(`${emoji}\\s*(${DATE})`, "u"))?.[1] ?? null;
const drop   = (line, emojis) => line.replace(new RegExp(`\\s*[${emojis}]\\s*${DATE}`, "gu"), "");
const OPEN   = /^\s*- \[ \]/, ANY = /^\s*- \[.\]/, DONE = /^\s*- \[[xX]\]/;

export class Task {
  constructor(line, src = null) { this.line = line; this.src = src; }
  static of(t) { return new Task(`- [${t.status}] ${t.text}`, t); }

  get status()     { return this.line.match(/^\s*- \[(.)\]/)?.[1] ?? null; }
  get isOpen()     { return this.status === " "; }
  get isDone()     { return DONE.test(this.line); }
  get isSkipped()  { return this.status === "-"; }
  get tags()       { return this.line.match(/#[^\s#]+/gu) ?? []; }
  get area()       { return this.tags.find(t => t.startsWith("#area/")) ?? null; }   // "#area/body"
  get difficulty() { return this.tags.find(t => t.startsWith("#⭐")) ?? null; }
  get time()       { return this.tags.find(t => t.startsWith("#time/"))?.slice(6) ?? null; }   // "morning" | "evening"
  get rule()       { return this.line.match(new RegExp(`🔁\\s*([^${FIELDS}]+)`, "u"))?.[1].trim() ?? null; }
  get isRecurring(){ return this.rule !== null; }
  get whenDone()   { return /when done$/.test(this.rule ?? ""); }
  get isBirthday() { return this.rule === "every year"; }
  get date()       { return field(this.line, "⏳") ?? field(this.line, "📅"); }   // the day it's on
  get doneOn()     { return field(this.line, "✅"); }
  get skippedOn()  { return field(this.line, "❌"); }
  get created()    { return field(this.line, "➕"); }
  get isPaused()   { return this.isOpen && this.isRecurring && !this.date; }   // a 🔁 task with its dates dropped
  get stickers()   { return [...this.line.matchAll(/!\[\[([^\]|]+)/g)].map(m => m[1]); }   // file names of ![[x.png|28]]
  // the words alone: no checkbox, sticker, tags, rule or date fields
  get text() {
    return drop(this.line.replace(ANY, "").replace(/^\s*- /, "").replace(/!\[\[[^\]]*\]\]/g, "").replace(/#[^\s]+/g, "")
      .replace(new RegExp(`🔁[^${FIELDS}]*`, "u"), ""), FIELDS).replace(/\s+/g, " ").trim();
  }
  // identity across copies (open, done, skipped) of the same task, for history and for finding its line again
  get key() { return this.text.toLowerCase(); }
  static keyOf = line => new Task(line).key;

  // { count, last } over `list` (Tasks) with the same key, by ✅ date (❌ for skipped ones), or null
  history(list) {
    const hits = list.filter(t => t.key === this.key);
    return hits.length ? { count: hits.length, last: hits.map(t => t.doneOn ?? t.skippedOn ?? "").sort().at(-1) } : null;
  }

  // ── edits: each returns the new line ──
  // set or clear the date of an open task: one date, 📅 (an old ⏳ goes)
  setDue(date) {
    if (!OPEN.test(this.line)) return this.line;
    const base = drop(this.line, "⏳📅").trimEnd();
    return date ? `${base} 📅 ${date}` : base;
  }
  // put it on `date` as done (✅ date) or open and due that day (📅, none for null). A 🔁 rule is left as is:
  // no next copy is made here. To tick an open 🔁 task, go through the Tasks plugin's toggle, then backdateDone.
  place(date, done) {
    if (!ANY.test(this.line)) return this.line;
    const base = drop(this.line, "✅").replace(/^(\s*- \[)./, `$1${done ? "x" : " "}`).trimEnd();
    return done ? `${base} ✅ ${date}` : new Task(base).setDue(date);
  }
  // swap the difficulty tag for `tag`, or drop it (null); without one, the tag goes first after the checkbox
  setDifficulty(tag) {
    const re = /(^|\s)#⭐+[^\s]*/u;
    if (re.test(this.line)) return tag ? this.line.replace(re, `$1${tag}`) : this.line.replace(re, "").replace(/(- \[.\])\s+/, "$1 ");
    return tag ? this.line.replace(/^(\s*- \[.\])\s*/, `$1 ${tag} `) : this.line;
  }
  // set or clear (null) a tag a line has once, by its prefix ("#area/", "#time/"): swapped in place, or added
  // after the tags that open the line
  setTag(prefix, tag) {
    const re = new RegExp(`(^|\\s)${prefix}\\S*`, "u");
    if (re.test(this.line)) return tag ? this.line.replace(re, `$1${tag}`) : this.line.replace(re, "");
    return tag ? this.line.replace(/^(\s*- \[.\](?:\s+#\S+)*)/u, `$1 ${tag}`) : this.line;
  }
  // the first sticker swapped for `name` (a file in the stickers folder) or dropped (null); without one, it goes
  // at the end of the text, before the rule and the date fields
  setSticker(name) {
    const re = /\s*!\[\[[^\]]*\]\]/;
    if (re.test(this.line)) return this.line.replace(re, name ? ` ![[${name}|28]]` : "");
    return name ? this.line.replace(new RegExp(`\\s*(?=[🔁${FIELDS}⏫🔼🔽🔺⏬🆔⛔🏁]|$)`, "u"), ` ![[${name}|28]] `).trimEnd() : this.line;
  }
  // what the task window shows and sets: difficulty, area, time ("#time/…") tags and the first sticker
  get picks() {
    return { difficulty: this.difficulty, area: this.area, time: this.time && `#time/${this.time}`, sticker: this.stickers[0] ?? null };
  }
  withPicks(p) {   // a key left out of p stays as it is
    let line = this.line;
    for (const [key, prefix] of [["difficulty", "#⭐"], ["area", "#area/"], ["time", "#time/"]])
      if (key in p) line = new Task(line).setTag(prefix, p[key]);
    return "sticker" in p ? new Task(line).setSticker(p.sticker) : line;
  }

  // as a pool line: no checkbox, rule or date fields
  get poolLine() {
    return drop(this.line.replace(/^(\s*)- \[.\]\s*/, "$1- ").replace(new RegExp(`\\s*🔁[^${FIELDS}]*`, "u"), ""), FIELDS).trimEnd();
  }
  // a pool line's new copy: an open task, created `today`
  static fromPool(line, today) { return `${line.trimEnd().replace(/^(\s*)- /, "$1- [ ] ")} ➕ ${today}`; }

  // pause: drop its ⏳ 📅 🛫 dates (it leaves the calendar). Resume: due on the first day from today its rule
  // allows: a weekday rule ("every week on Monday, …") its next such day, any other rule today.
  // ponytail: only weekday rules are matched; "every month on the 1st" resumes today too.
  pause() { return drop(this.line, "📅⏳🛫"); }
  resume(today) {
    const rule = this.rule ?? "";
    const day  = /^every (\d+ )?weeks? on /i.test(rule) ? projectRepeats(rule, addDays(today, -1), addDays(today, 30))[0] ?? today : today;
    return `${this.pause().trimEnd()} 📅 ${day}`;
  }

  // ── the Tasks plugin's output of ticking a task today (the done line, plus the next copy of a 🔁 task) ──
  // as if ticked on `date`: ✅ moves there, and a "when done" next copy moves back with it
  static backdateDone(toggled, date, today) {
    const shift = diffDays(date, today);
    return toggled.split("\n").map(l =>
      DONE.test(l) ? new Task(l).place(date, true)
      : /when done/.test(l) ? l.replace(/([📅⏳🛫])\s*(\d{4}-\d{2}-\d{2})/gu, (_, e, d) => `${e} ${addDays(d, shift)}`)
      : l).join("\n");
  }
  // as a skip of this time: the done line turns cancelled ("- [-] … ❌ date"), so the rule moves on
  // but nothing counts as done
  static skipLines(toggled) {
    return toggled.split("\n").map(l => /^\s*- \[x\]/.test(l) ? l.replace(/^(\s*- \[)x/, "$1-").replace(/✅(\s*\d{4}-\d{2}-\d{2})/u, "❌$1") : l).join("\n");
  }
}

// How many things are on today's plate, same rules as the old Kanban2 Today column:
// picked for today (⏳ today), routines due by today, deadlines due by today.
// tasks: [{done, recurring, due?, scheduled?}] with "YYYY-MM-DD" dates.
export const todayCount = (tasks, date) => tasks.filter(t => !t.done && (
  t.recurring ? (t.due ?? t.scheduled) !== undefined && (t.due ?? t.scheduled) <= date
              : t.scheduled === date || (t.due !== undefined && t.due <= date)
)).length;
