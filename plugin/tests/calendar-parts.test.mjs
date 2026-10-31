import { test } from "node:test";
import assert from "node:assert/strict";
import { TaskText, TaskRow, TaskCard } from "../src/calendar/components.js";

// what a task shows: its key in the view's map, area, difficulty, text, sticker images, the actions it has
const info = over => ({ key: 7, area: "body", difficulty: "#⭐⭐medium", text: "walk <fast>", label: "🌺 walk <fast>", stickers: ["app://x/levi.png"], ...over });

test("TaskText: stars (none without a difficulty), the text, the stickers — as the old createEl calls drew them", () => {
  assert.equal(new TaskText({ task: info() }).html,
    '<span class="tag" data-tag-name="#⭐⭐medium" title="difficulty"></span> walk &lt;fast&gt; <img class="winx-cal__sticker" src="app://x/levi.png" alt="">');
  assert.equal(new TaskText({ task: info({ difficulty: null, stickers: [] }), withIcon: true }).html,
    ' 🌺 walk &lt;fast&gt; ');
});

test("TaskRow: a day's row — checkbox in the week, 🔁 for a repeat, buttons for an open one", () => {
  const open = new TaskRow({ task: info({ canSkip: true }), kind: "open", compact: false, tick: true }).html;
  assert.match(open, /^<div class="winx-cal__task winx-cal__task--open" data-area="body" data-task="7" draggable="true" data-drag="7" data-swipeable="7">/);
  assert.match(open, /<input type="checkbox" class="task-list-item-checkbox" aria-label="done" data-action="tick">/);
  assert.match(open, /<div class="winx-task-btns"><button class="winx-btn round" data-action="skip" title="skip this time" aria-label="skip this time">⏭<\/button>/);
  const ghost = new TaskRow({ task: info(), kind: "ghost", compact: false, tick: true }).html;
  assert.match(ghost, /^<div class="winx-cal__task winx-cal__task--ghost" data-area="body" data-task="7">🔁 <span class="tag"/);
  assert.doesNotMatch(ghost, /checkbox|winx-task-btns|draggable/);
  const done = new TaskRow({ task: info(), kind: "done", compact: false, tick: true }).html;
  assert.match(done, /<input type="checkbox" class="task-list-item-checkbox" aria-label="done" checked disabled>/);
  const month = new TaskRow({ task: info(), kind: "open", compact: true, tick: true }).html;
  assert.match(month, / title="🌺 walk &lt;fast&gt;"/);
  assert.doesNotMatch(month, /checkbox|winx-task-btns/);
});

test("TaskCard: a panel card, its meta line and buttons", () => {
  const card = new TaskCard({ task: info(), meta: "waiting 3 d", extra: "" }).html;
  assert.match(card, /^<div class="winx-task-card" data-area="body" draggable="true" data-task="7" data-drag="7" data-swipeable="7"><div class="winx-task-card__text"><span class="tag"/);
  assert.match(card, /<div class="winx-task-card__meta">waiting 3 d<\/div><div class="winx-task-btns">/);
  const pool = new TaskCard({ task: info({ pool: true }), meta: "never done" }).html;
  assert.match(pool, /data-action="edit"/);
  assert.doesNotMatch(pool, /data-action="skip"/);   // a pool card: ✏️ and 🗑 only
});
