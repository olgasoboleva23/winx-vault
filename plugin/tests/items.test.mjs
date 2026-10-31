import { test } from "node:test";
import assert from "node:assert/strict";
import { KINDS, itemNote, itemPath } from "../src/commands/items.js";

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
  assert.equal(itemPath("read", "Moon: Tales?", p => taken.has(p)), "03 Resources/Collections/Readlist/Moon Tales 1.md");
  assert.equal(itemPath("watch", "  ", () => false), "03 Resources/Collections/Watchlist/Untitled.md");
  assert.deepEqual(Object.keys(KINDS), ["watch", "read", "game"]);
});
