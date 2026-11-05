import { test } from "node:test";
import assert from "node:assert/strict";
import { Note, notePath } from "#/models/note.js";
import { KINDS, daily, parseMeds } from "#/models/kinds.js";

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

test("parseMeds: the medicines typed on one line: name, dose, the times of day (none: once a day)", () => {
  assert.deepEqual(parseMeds("Мастодинон 30 капель утро вечер; Аевит 1 таблетка; Новопассит 2 таблетки на ночь"), [
    { name: "Мастодинон", dose: "30 капель", times: ["☀️", "🌙"], code: "МА" },
    { name: "Аевит", dose: "1 таблетка", times: [], code: "АЕ" },
    { name: "Новопассит", dose: "2 таблетки", times: ["🌙"], code: "НО" },
  ]);
  assert.deepEqual(parseMeds("Magne B6 2 tabs morning, evening; ; Ursosan"), [
    { name: "Magne B6", dose: "2 tabs", times: ["☀️", "🌙"], code: "MA" },
    { name: "Ursosan", dose: "", times: [], code: "UR" },
  ]);
});

test("a medication course: the start and length as properties, the doses, the legend and a day per row", () => {
  const text = make("meds", { start: "2026-11-05", days: 92, meds: "Мастодинон 30 капель утро вечер; Аевит 1 таблетка; Новопассит 2 таблетки на ночь" });
  assert.match(text, /^---\ntype: meds\nstart: 2026-11-05\ndays: 92\n---\n\n- Мастодинон/);
  assert.equal(KINDS.meds.note({ meds: "Мастодинон 30 капель; Аевит" }, "2026-11-05").file, "Мастодинон, Аевит");
  assert.match(text, /\n- Мастодинон — 30 капель, утро и вечер\n- Аевит — 1 таблетка\n- Новопассит — 2 таблетки, на ночь\n/);
  assert.match(text, /\n\| МА \| Мастодинон \|\n/);
  assert.match(text, /\n\| Дата \| МА☀️ \| МА🌙 \| АЕ \| НО🌙 \| Заметки \|\n\| --- \| :-: \| :-: \| :-: \| :-: \| --- \|\n\| 2026-11-05 \| ☐ \| ☐ \| ☐ \| ☐ \|  \|\n/);
  assert.match(text, /\n\| 2027-02-04 \| ☐ \| ☐ \| ☐ \| ☐ \|  \|\n$/);
  assert.equal(text.match(/^\| 20\d\d-/gm).length, 92);
  // no start typed: today; no length: 90 days
  assert.match(make("meds", { meds: "Аевит 1 таблетка" }, "2026-10-29"), /\nstart: 2026-10-29\ndays: 90\n/);
});
