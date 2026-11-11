// A line of a Winx log in the Tasks plugin's Dataview format and its record: the line holds the
// checkbox, the id (its first word) and Tasks' fields, the record (a JSON entry by that id) the
// rest. What a task (models/task.js) and a market item (models/market.js) share; each names its
// id's letter (static ID). No Obsidian globals.
export const FIELD = /\[(\w+):: ([^\]]*)\]/g;
const SPACED = new RegExp(`\\s*${FIELD.source}`, "g");   // a field with the spaces before it

export const ANY = /^\s*- \[.\]/;

// every [key:: value] of a line, by key
export const fieldsOf = line =>
  Object.fromEntries([...line.matchAll(FIELD)].map(m => [m[1], m[2]]));

// a line with one field set (replaced in place, or added at the end); null drops it
export function withField(line, key, value) {
  const text = value === null ? "" : ` [${key}:: ${value}]`;
  let found = false;
  const out = line.replace(SPACED, (m, k) => k !== key || found ? m : (found = true, text));

  return found ? out : line.trimEnd() + text;
}

// a store item's line ({ text, status }): what each kind's of(t) wraps, keeping t as .src
export const lineOf = t => `- [${t.status}] ${t.text}`;

export class LineItem {
  constructor(line, src = null, rec = null) { this.line = line; this.src = src; this.rec = rec; }
  get fields() { return fieldsOf(this.line); }
  get status() { return this.line.match(/^\s*- \[(.)\]/)?.[1] ?? null; }
  get isOpen() { return this.status === " "; }
  get isDone() { return /^[xX]$/.test(this.status ?? ""); }
  get id()     { return this.words.match(this.constructor.ID)?.[0] ?? null; }
  get doneOn() { return this.fields.completion ?? null; }
  // its name: the record's, else the line's words (a line whose id has no record: the id)
  get name()   { return this.rec?.name ?? this.words; }
  // identity across copies (open, done, skipped) of the same thing: its id, else its words
  // lowercased
  get key()    { return this.id ?? this.words.toLowerCase(); }
  // the line's words alone: no checkbox, sticker, tags or fields
  get words() {
    return this.line.replace(ANY, "").replace(/^\s*- /, "").replace(FIELD, "")
      .replace(/!\[\[[^\]]*\]\]/g, "").replace(/#[^\s]+/g, "").replace(/\s+/g, " ").trim();
  }
}
