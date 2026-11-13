import { test } from "node:test";
import assert from "node:assert/strict";
import { Note, notePath } from "#/models/note.js";
import { KINDS, daily } from "#/models/kinds.js";

const make = (kind, v, today = "2026-10-29") => new Note(KINDS[kind].note(v, today)).text;

test("a note from data: properties, a title when given, the sections", () => {
  const note = new Note({ props: { type: "x", name: 'The "Tea" Shop', n: 7, empty: null, tags: [], list: ["a", "b"] }, title: "T", sections: { One: "", Two: "- [ ] go" } });
  assert.equal(note.text, `---
type: x
name: "The \\"Tea\\" Shop"
n: 7
empty:
tags: []
list:
  - a
  - b
---

# T

## One

## Two
- [ ] go
`);
});

test("a watch item's note", () => {
  assert.equal(make("watch", { title: "Moon Tales", media_type: "anime", status: "to_watch" }), `---
type: watch
media_type: anime
status: to_watch
rating:
created: 2026-10-29
tags:
---

## Notes

## Progress
- [ ] Start
- [ ] Watch
- [ ] Finish
`);
});

test("a game has a genre and hours instead of a type", () => {
  const note = make("game", { title: "Star Garden", status: "playing", genre: "cozy" });
  assert.match(note, /\nstatus: playing\ngenre: cozy\nrating:\nhours:\ncreated: 2026-10-29\n/);
  assert.match(note, /- \[ \] Play\n/);
  assert.match(make("game", { title: "X", status: "playing" }), /\ngenre:\n/);   // genre is optional
});

test("a recipe and a work task: their properties and sections", () => {
  const recipe = make("recipe", { title: "Pumpkin soup" });
  assert.match(recipe, /^---\ntype: recipe\ntags: \[\]\n/);
  assert.match(recipe, /\n---\n\n## Ingredients\n\n## Steps\n\n## Notes\n\n## Variations\n$/);
  const work = make("work", { title: "Fix login" }, "2026-10-31");
  assert.match(work, /^---\nstatus: active\ncreated: 2026-10-31\nasana:\n---\n\n## Зачем\n/);
  assert.match(work, /\n## Сделать\n- \[ \] \n/);
});

test("the note's path: in its folder, no characters a file name can't have, numbered if taken", () => {
  const taken = new Set(["03 Resources/Collections/Readlist/Moon Tales.md"]);
  assert.equal(notePath(KINDS.read.folder, "Moon: Tales?", p => taken.has(p)), "03 Resources/Collections/Readlist/Moon Tales 1.md");
  assert.equal(notePath(KINDS.watch.folder, "  ", () => false), "03 Resources/Collections/Watchlist/Untitled.md");
});

test("a watch, read or game item can get a rating 1–10 in its window; it goes into the note", () => {
  for (const kind of ["read", "game"]) assert.ok(KINDS[kind].form().rows.some(r => r.key === "rating"), kind);
  const { rows, required } = KINDS.watch.form();
  assert.deepEqual(rows.find(r => r.key === "rating").options.map(o => o.value), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(!required.includes("rating"));   // rated later, after watching
  assert.match(make("watch", { title: "X", media_type: "movie", status: "completed", rating: 7 }), /\nrating: 7\n/);
});

test("a daily note: its date, the day as the title, Notes and the XP log", () => {
  assert.equal(new Note(daily("2026-11-02", "Monday, November 2")).text, `---
date: 2026-11-02
---

# Monday, November 2

## 📝 Notes

## 🎯 XP Log
-
`);
});

test("a string that YAML would read as another type stays a string: true, null, 123 in quotes", () => {
  const text = new Note({ props: { a: "true", b: "null", c: "123", d: "no", e: 5, f: "Tea 2" }, title: "T" }).text;
  assert.match(text, /^a: "true"$/m);
  assert.match(text, /^b: "null"$/m);
  assert.match(text, /^c: "123"$/m);
  assert.match(text, /^d: "no"$/m);
  assert.match(text, /^e: 5$/m);
  assert.match(text, /^f: Tea 2$/m);
  const more = new Note({ props: { a: "0x10", b: "1e3", c: "2026-11-02", d: "y" }, title: "T" }).text;
  assert.match(more, /^a: "0x10"$/m);
  assert.match(more, /^b: "1e3"$/m);
  assert.match(more, /^c: 2026-11-02$/m);   // a date stays a date
  assert.match(more, /^d: "y"$/m);
});

test("a work task's file: the next number in its folder, then the title in lower case with underscores", () => {
  const names = ["38_mail_templates.md", "3_taxonomy_for_skelary_2.md", "_future_tasks_notes.md"];
  assert.equal(KINDS.work.file({ title: "Versions bug on Duplicates" }, names), "39_versions_bug_on_duplicates");
  assert.equal(KINDS.work.file({ title: "First" }, []), "1_first");
});

test("a free journal: its reasons from the window's items, its lag, the note named by its title", () => {
  const text = make("journal", { title: "Живот", reasons: [{ reason: "🥛 молоко" }, { reason: "❔ не знаю " }, {}], lag: 1 });
  assert.match(text, /^---\ntype: journal\nlag: 1\nreasons:\n  - "🥛 молоко"\n  - "❔ не знаю"\n---\n/);
  assert.deepEqual(KINDS.journal.form().rows.map(r => r.key), ["title", "reasons", "lag"]);
});
