import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

// A task as the calendar draws it (TaskText, TaskRow, TaskCard): draggable, its checkbox, its buttons
let mount, TaskText, TaskRow, TaskCard;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  // a component is <Name>.vue, or <Name>/index.vue when it has its own styles
  const load = async n => (await import(`../src/components/pages/calendar/${n}`)).default;
  [TaskText, TaskRow, TaskCard] = await Promise.all(["TaskText.vue", "TaskRow.vue", "TaskCard/index.vue"].map(load));
});
const info = over => ({ key: "k7", area: "body", difficulty: "medium", text: "walk <fast>", label: "🌺 walk <fast>",
  sticker: "app://x/levi.png", canSkip: false, ...over });
const global = { provide: { calendar: { task: () => null } } };
const html = (C, props) => mount(C, { props, global }).html({ raw: true }).replace(/<!--[^]*?-->/g, "");

test("TaskText: stars (none without a difficulty), the text, the sticker", () => {
  assert.equal(mount({ components: { TaskText }, template: "<div><TaskText :task='t' /></div>", data: () => ({ t: info() }) })
    .element.innerHTML.replace(/<!--[^]*?-->/g, ""),
    '<span class="tag" data-difficulty="medium" aria-label="difficulty" data-tip="winx-tooltip"></span> walk &lt;fast&gt; ' +
    '<img class="winx-cal__sticker" src="app://x/levi.png" alt="">');
});

test("TaskText: 🌅 / 🌙 before a one-off's label", () => {
  const t = time => mount(TaskText, { props: { task: info({ daytime: time }), withIcon: true } }).text();
  assert.equal(t("morning"), "🌅 🌺 walk <fast>");
  assert.equal(t("evening"), "🌙 🌺 walk <fast>");
  assert.equal(t(null), "🌺 walk <fast>");
});

test("TaskRow: a day's row — checkbox in the week, 🔁 for a repeat, buttons for an open one", () => {
  const open = html(TaskRow, { task: info({ canSkip: true }), kind: "open", tick: true });
  assert.match(open, /^<div class="winx-cal__task winx-cal__task--open" data-area="body" draggable="true">/);
  assert.match(open, /<input type="checkbox" class="task-list-item-checkbox" aria-label="done">/);
  assert.match(open, /<div class="winx-task-btns"><button class="winx-btn winx-btn--round" aria-label="skip this time" data-tip="winx-tooltip">⏭<\/button>/);
  const ghost = html(TaskRow, { task: info(), kind: "ghost", tick: true });
  assert.match(ghost, /^<div class="winx-cal__task winx-cal__task--ghost" data-area="body">🔁 <span class="tag"/);
  assert.doesNotMatch(ghost, /checkbox|winx-task-btns|draggable/);
  const month = html(TaskRow, { task: info(), kind: "open", compact: true, tick: true });
  assert.match(month, / aria-label="🌺 walk <fast>"/);   // the tooltip; the DOM writes "<" as it is in an attribute
  assert.doesNotMatch(month, /checkbox|winx-task-btns/);
  const after = html(TaskRow, { task: info(), kind: "open", tick: true, after: true });
  assert.match(after, /draggable="true"><span class="winx-cal__after">↳<\/span><input type="checkbox"/);
  // a goal's task: its row says so (the tick plays the goal's sound)
  assert.match(html(TaskRow, { task: info({ goal: true }), kind: "open", tick: true }), /^<div class="winx-cal__task winx-cal__task--open" data-area="body" data-goal="true"/);
});

test("TaskCard: a panel card, its meta line, its buttons (a pool item: ✏️ 🗑 only)", () => {
  const card = html(TaskCard, { task: info({ canSkip: true }), meta: "waiting 3 d" });
  assert.match(card, /^<div class="winx-task-card" data-area="body" draggable="true"><div class="winx-task-card__text"><span class="tag"/);
  assert.match(card, /<div class="winx-task-card__meta">waiting 3 d<\/div><div class="winx-task-btns">/);
  const pool = html(TaskCard, { task: info({ pool: true }), meta: "never done" });
  assert.match(pool, /aria-label="edit: difficulty, area, time, sticker, then text"/);
  assert.doesNotMatch(pool, /skip this time/);
});
