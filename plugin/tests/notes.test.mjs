import { test } from "node:test";
import assert from "node:assert/strict";
import { Note, notePath, fillDaily } from "../src/notes/note.js";
import { KINDS } from "../src/notes/kinds.js";

const make = (kind, v, today = "2026-10-29") => new Note(KINDS[kind].note(v, today)).text;

test("a note from data: properties, the title, the sections", () => {
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
title: Moon Tales
media_type: anime
status: to_watch
rating:
created: 2026-10-29
tags:
---

# 🎬 Moon Tales

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
  assert.match(recipe, /^---\ntype: recipe\nname: Pumpkin soup\ntags: \[\]\n/);
  assert.match(recipe, /\n# Pumpkin soup\n\n## Ingredients\n\n## Steps\n\n## Notes\n\n## Variations\n$/);
  const work = make("work", { title: "Fix login" }, "2026-10-31");
  assert.match(work, /^---\nstatus: active\ncreated: 2026-10-31\nasana:\n---\n\n# Fix login\n/);
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

test("the daily template, as Obsidian's Daily notes fills it: {{date}}, {{date:FORMAT}}, {{title}}", () => {
  const format = f => `<${f ?? "YYYY-MM-DD"}>`;
  assert.equal(fillDaily("date: {{date}}\n# {{date:dddd, MMMM D}}\n{{title}}", format, "2026-11-02"), "date: <YYYY-MM-DD>\n# <dddd, MMMM D>\n2026-11-02");
});
