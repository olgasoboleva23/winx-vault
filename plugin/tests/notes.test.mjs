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

test("a medication course: its medicines as the window's groups (name and dose, when, days): the doses, the legend, a day per row up to the longest", () => {
  const meds = [
    { name: "Мастодинон 30 капель", times: "both", meal: "before", days: 92 },
    { name: "Аевит", dose: "1 таблетка", times: "any" },
    { name: "Новопассит 2 таблетки", times: "evening", days: 30 },
    { name: "Магний", times: "day", meal: "any", days: 10 },
  ];
  const text = make("meds", { start: "2026-11-05", meds });
  // the medicines as data too (to edit the course later), the notes on their own card
  assert.match(text, /^---\ntype: meds\nstart: 2026-11-05\ndays: 92\ncssclasses:\n  - dashboard\nmeds:\n  - \{"name":"Мастодинон 30 капель","dose":"","times":"both","meal":"before","days":92\}\n  - \{"name":"Аевит","dose":"1 таблетка","times":"any","meal":"any","days":90\}\n/);
  assert.match(text, /\n---\n\n> \[!card\] Приём\n> - ☀️ утро/);
  const noted = make("meds", { start: "2026-11-05", meds, notes: "от врача:\nне запивать молоком" });

  assert.match(noted, /\nnotes: "от врача:\\nне запивать молоком"\n---\n/);   // a property too, to edit
  assert.match(noted, /\n> - в любое время: Аевит 1 таблетка\n\n> \[!card\] Заметки\n> от врача:\n> не запивать молоком\n\n> \[!card\] Легенда\n/);
  assert.equal(KINDS.meds.note({ meds }, "2026-11-05").file, "Мастодинон, Аевит, Новопассит, Магний");
  // the day by its anchors (a time of day and a meal), the medicines with their doses after it
  assert.match(text, /\n> - ☀️ утро, перед едой: Мастодинон 30 капель\n> - 🌤 днём: Магний\n> - 🌙 на ночь, перед едой: Мастодинон 30 капель\n> - 🌙 на ночь: Новопассит 2 таблетки\n> - в любое время: Аевит 1 таблетка\n\n> \[!card\] Легенда\n> \| Код \| Препарат \|\n/);
  assert.match(text, /\n> \| МА \| Мастодинон \|\n/);
  assert.match(text, /\n> \| ☀️ \| утро \|\n> \| 🌤 \| день \|\n> \| 🌙 \| вечер \/ на ночь \|\n\n```winx\n/);
  // the table inside a winx block: the course's page draws and ticks it
  assert.match(text, /\n```winx\nmeds\ncard: Курс\n\| Дата \| МА☀️ \| МА🌙 \| АЕ \| НО🌙 \| МА🌤 \| Заметки \|\n\| --- \| :-: \| :-: \| :-: \| :-: \| :-: \| --- \|\n\| 2026-11-05 \| ☐ \| ☐ \| ☐ \| ☐ \| ☐ \|  \|\n/);
  assert.match(text, /\n\| 2026-11-15 \| ☐ \| ☐ \| ☐ \| ☐ \|  \|  \|\n/);   // Магний's 10 days are over
  assert.match(text, /\n\| 2026-12-05 \| ☐ \| ☐ \| ☐ \|  \|  \|  \|\n/);   // Новопассит's 30 too
  assert.match(text, /\n\| 2027-02-04 \| ☐ \| ☐ \|  \|  \|  \|  \|\n```\n$/);   // Аевит's 90 as well
  assert.equal(text.match(/^\| 20\d\d-/gm).length, 92);
  // no start typed: today; no days: 90; a name without a dose
  assert.match(make("meds", { meds: [{ name: "Аевит" }] }, "2026-10-29"), /\nstart: 2026-10-29\ndays: 90\ncssclasses:\n  - dashboard\nmeds:\n  - \{"name":"Аевит","dose":"","times":"any","meal":"any","days":90\}\n---\n\n> \[!card\] Приём\n> - в любое время: Аевит\n/);
  // the window: the medicines as a list of groups, a name each
  const { rows, required } = KINDS.meds.form();
  assert.deepEqual(rows.map(r => r.key), ["meds", "start", "notes"]);
  assert.equal(rows[2].lines, true);
  assert.deepEqual(rows[0].list.map(r => r.key), ["name", "dose", "times", "meal", "days"]);
  assert.deepEqual(rows[0].list[3].options.map(o => o.label), ["перед едой", "после еды", "перед сном", "неважно"]);
  assert.deepEqual(rows[0].required, ["name"]);
  assert.deepEqual(rows[0].list[2].options.map(o => o.label), ["утром", "утром и вечером", "днём", "вечером", "неважно"]);
  assert.deepEqual(required, ["meds"]);
});

test("a work task's file: the next number in its folder, then the title in lower case with underscores", () => {
  const names = ["38_mail_templates.md", "3_taxonomy_for_skelary_2.md", "_future_tasks_notes.md"];
  assert.equal(KINDS.work.file({ title: "Versions bug on Duplicates" }, names), "39_versions_bug_on_duplicates");
  assert.equal(KINDS.work.file({ title: "First" }, []), "1_first");
});
