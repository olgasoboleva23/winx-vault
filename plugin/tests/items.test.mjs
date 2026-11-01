import { test } from "node:test";
import assert from "node:assert/strict";
import { KINDS, itemForm, itemNote, itemPath, fillTemplate } from "../src/commands/items.js";

test("a watch item's note", () => {
  const note = itemNote("watch", { title: 'The "Tea" Shop', media_type: "anime", status: "to_watch" }, "2026-10-29");
  assert.equal(note, `---
type: watch
title: "The \\"Tea\\" Shop"
media_type: anime
status: to_watch
rating: 
created: 2026-10-29
tags:
---

# 🎬 The "Tea" Shop

## Notes

## Progress
- [ ] Start
- [ ] Watch
- [ ] Finish
`);
});

test("a game has a genre and hours instead of a type", () => {
  const note = itemNote("game", { title: "Star Garden", status: "playing", genre: "cozy" }, "2026-10-29");
  assert.match(note, /\nstatus: playing\ngenre: cozy\nrating: \nhours: \ncreated: 2026-10-29\n/);
  assert.match(note, /- \[ \] Play\n/);
  assert.match(itemNote("game", { title: "X", status: "playing" }, "2026-10-29"), /\ngenre: \n/);   // genre is optional
});

test("the note's path: in its folder, no characters a file name can't have, numbered if taken", () => {
  const taken = new Set(["03 Resources/Collections/Readlist/Moon Tales.md"]);
  assert.equal(itemPath(KINDS.read.folder, "Moon: Tales?", p => taken.has(p)), "03 Resources/Collections/Readlist/Moon Tales 1.md");
  assert.equal(itemPath(KINDS.watch.folder, "  ", () => false), "03 Resources/Collections/Watchlist/Untitled.md");
  assert.deepEqual(Object.keys(KINDS), ["watch", "read", "game"]);
});

test("a template gets the title and today's date", () => {
  const text = "created: {{date}}\nname: {{title}}\n# <% tp.file.title %>\n# {{title}}\n";
  assert.equal(fillTemplate(text, "Fix login", "2026-10-31"), "created: 2026-10-31\nname: Fix login\n# Fix login\n# Fix login\n");
});

test("a watch, read or game item can get a rating 1–10 in its window; it goes into the note", () => {
  for (const kind of ["read", "game"]) assert.ok(itemForm(kind).rows.some(r => r.key === "rating"), kind);
  const { rows, required } = itemForm("watch");
  const rating = rows.find(r => r.key === "rating");
  assert.deepEqual(rating.options.map(o => o.value), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  assert.ok(!required.includes("rating"));   // rated later, after watching
  assert.match(itemNote("watch", { title: "X", media_type: "movie", status: "completed", rating: 7 }, "2026-11-01"), /\nrating: 7\n/);
});
