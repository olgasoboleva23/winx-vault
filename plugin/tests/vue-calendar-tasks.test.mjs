import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// A task as the calendar draws it (TaskText, TaskRow, TaskCard): its keys for drag / swipe, its checkbox, its buttons
let mount, TaskText, TaskRow, TaskCard;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  // a component is <Name>.vue, or <Name>/index.vue when it has its own styles
  const load = async n => (await import(`../src/components/pages/calendar/${n}`)).default;
  [TaskText, TaskRow, TaskCard] = await Promise.all(["TaskText.vue", "TaskRow.vue", "TaskCard/index.vue"].map(load));
});
const info = over => ({ key: "k7", area: "body", difficulty: "#⭐⭐medium", text: "walk <fast>", label: "🌺 walk <fast>",
  stickers: ["app://x/levi.png"], canSkip: false, ...over });
const global = { provide: { calendar: { task: () => null } } };
const html = (C, props) => mount(C, { props, global }).html({ raw: true }).replace(/<!--[^]*?-->/g, "");

test("TaskText: stars (none without a difficulty), the text, the stickers", () => {
  assert.equal(mount({ components: { TaskText }, template: "<div><TaskText :task='t' /></div>", data: () => ({ t: info() }) })
    .element.innerHTML.replace(/<!--[^]*?-->/g, ""),
    '<span class="tag" data-tag-name="#⭐⭐medium" title="difficulty"></span> walk &lt;fast&gt; ' +
    '<img class="winx-cal__sticker" src="app://x/levi.png" alt="">');
});

test("TaskRow: a day's row — checkbox in the week, 🔁 for a repeat, buttons for an open one", () => {
  const open = html(TaskRow, { task: info({ canSkip: true }), kind: "open", tick: true });
  assert.match(open, /^<div class="winx-cal__task winx-cal__task--open" data-area="body" data-task="k7" draggable="true" data-drag="k7" data-swipeable="k7">/);
  assert.match(open, /<input type="checkbox" class="task-list-item-checkbox" aria-label="done" data-action="tick">/);
  assert.match(open, /<div class="winx-task-btns"><button class="winx-btn winx-btn--round" title="skip this time" aria-label="skip this time">⏭<\/button>/);
  const ghost = html(TaskRow, { task: info(), kind: "ghost", tick: true });
  assert.match(ghost, /^<div class="winx-cal__task winx-cal__task--ghost" data-area="body" data-task="k7">🔁 <span class="tag"/);
  assert.doesNotMatch(ghost, /checkbox|winx-task-btns|draggable/);
  const month = html(TaskRow, { task: info(), kind: "open", compact: true, tick: true });
  assert.match(month, / title="🌺 walk <fast>"/);   // the DOM writes "<" as it is in an attribute
  assert.doesNotMatch(month, /checkbox|winx-task-btns/);
  const after = html(TaskRow, { task: info(), kind: "open", tick: true, after: true });
  assert.match(after, /data-swipeable="k7"><span class="winx-cal__after">↳<\/span><input type="checkbox"/);
});

test("TaskCard: a panel card, its meta line, its buttons (a pool item: ✏️ 🗑 only)", () => {
  const card = html(TaskCard, { task: info({ canSkip: true }), meta: "waiting 3 d" });
  assert.match(card, /^<div class="winx-task-card" data-area="body" draggable="true" data-task="k7" data-drag="k7" data-swipeable="k7"><div class="winx-task-card__text"><span class="tag"/);
  assert.match(card, /<div class="winx-task-card__meta">waiting 3 d<\/div><div class="winx-task-btns">/);
  const pool = html(TaskCard, { task: info({ pool: true }), meta: "never done" });
  assert.match(pool, /title="edit: difficulty, area, time, sticker, then text"/);
  assert.doesNotMatch(pool, /skip this time/);
});
