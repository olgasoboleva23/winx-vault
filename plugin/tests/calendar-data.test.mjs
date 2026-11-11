import { test } from "node:test";
import assert from "node:assert/strict";
import { weekOf } from "#/helpers/dates.js";
import { T, CalendarData, canReorder } from "#/models/calendarData.js";
import { idTask } from "./stubs/idTask.mjs";

// the store's tasks: { status, text, path, line, rec }, from a readable spec (idTask)
let n = 0;
const task = (status, spec) => ({ status, ...idTask(spec), path: "Tasks/Master.md", line: n++ });
// a pool record's item
const poolItem = spec => { const { text, rec } = idTask(spec); return { id: text, pool: true, rec, path: "tasks.json" }; };
const texts = list => list.map(t => T(t).text);
const TODAY = "2026-10-28";   // a Wednesday
const AREAS = ["body", "mind", "base"];
const data = (tasks, { poolLines = [], days = weekOf(TODAY) } = {}) => new CalendarData({ tasks, poolLines, days, today: TODAY, areaOrder: AREAS });

test("days: open on their date, done on their ✅ date, 🔁 repeats faded in the future only", () => {
  const m = data([   // the week 26.10 … 01.11
    task(" ", "#area/body walk [due:: 2026-10-30]"),
    task("x", "#area/mind read [completion:: 2026-10-27]"),
    task(" ", "#area/body stretch [repeat:: every day] [due:: 2026-10-28]"),
    task(" ", "#area/base call bank [due:: 2026-10-20]"),          // overdue: not on the days
    task(" ", "#area/base plan trip"),                        // no date: the backlog
    task(" ", "#area/body mask [repeat:: every 3 days when done]"),   // paused regular: neither
    task("-", "#area/body stretch [repeat:: every day] [due:: 2026-10-26] [cancelled:: 2026-10-26]"),
  ]);
  assert.deepEqual(m.byDay["2026-10-30"].map(e => [T(e.t).text, e.kind]), [["walk", "open"], ["stretch", "ghost"]]);
  assert.deepEqual(m.byDay["2026-10-27"].map(e => [T(e.t).text, e.kind]), [["read", "done"]]);
  assert.deepEqual(m.byDay["2026-10-28"].map(e => [T(e.t).text, e.kind]), [["stretch", "open"]]);   // no ghost today
  assert.equal(m.byDay["2026-10-20"], undefined);
  assert.ok(!Object.values(m.byDay).flat().some(e => T(e.t).text === "call bank"));
  assert.deepEqual(texts(m.backlog), ["plan trip"]);
  assert.deepEqual(texts(m.regulars), ["stretch", "mask"]);
  assert.deepEqual([...m.doneBy.keys()], [T(m.byDay["2026-10-27"][0].t).id]);   // by id
  assert.deepEqual([...m.skipsBy.keys()], [T(m.regulars[0]).id]);
});

test("a day lists open, then repeats, then done", () => {
  const m = data([
    task("x", "tea [completion:: 2026-10-29]"),
    task(" ", "yoga [repeat:: every day] [due:: 2026-10-28]"),
    task(" ", "post letter [due:: 2026-10-29]"),
  ]);
  assert.deepEqual(m.byDay["2026-10-29"].map(e => e.kind), ["open", "ghost", "done"]);
});

test("pool records become pool items with their own Task", () => {
  const item = poolItem("#⭐easy #area/base take out trash");
  const m = data([], { poolLines: [item] });
  assert.equal(m.pool.length, 1);
  assert.ok(m.pool[0].pool);
  assert.equal(T(m.pool[0]).text, "take out trash");
  assert.equal(T(m.pool[0]).area, "base");
  assert.equal(T(m.pool[0]).line, `- ${item.id}`);
  assert.ok(m.all.includes(m.pool[0]));   // a data-task key finds pool items too
});

test("missed: open tasks whose day has passed, the latest first", () => {
  const m = data([
    task(" ", "a [due:: 2026-10-20]"), task(" ", "b [due:: 2026-10-27]"), task(" ", "c [due:: 2026-10-28]"),
    task("x", "d [due:: 2026-10-21] [completion:: 2026-10-21]"), task(" ", "e"),
  ]);
  assert.deepEqual(texts(m.missed), ["b", "a"]);
});

test("No date: by area, then the longest waiting", () => {
  const m = data([
    task(" ", "#area/mind learn [created:: 2026-10-01]"),
    task(" ", "#area/body run [created:: 2026-10-20]"),
    task(" ", "#area/body swim [created:: 2026-09-01]"),
    task(" ", "#area/other tidy"),
  ]);
  assert.deepEqual(texts(m.backlog), ["swim", "run", "learn", "tidy"]);
});

test("Pool: by area, then the longest since last done (never done first)", () => {
  const m = data([task("x", "dust [completion:: 2026-10-01]"), task("x", "vacuum [completion:: 2026-09-01]")], { days: [TODAY], poolLines: [
    poolItem("#area/base dust"), poolItem("#area/base vacuum"),
    poolItem("#area/base wash windows"), poolItem("#area/body run"),
  ] });
  assert.deepEqual(texts(m.pool), ["run", "wash windows", "vacuum", "dust"]);
});

test("Regulars: by area, dated before paused, the most overdue first; birthdays go to Ahead", () => {
  const regulars = data([
    task("x", "floss [completion:: 2026-10-27]"),
    task(" ", "#area/body floss [repeat:: every day] [due:: 2026-10-28]"),
    task(" ", "#area/body mask [repeat:: every week]"),                    // paused
    task(" ", "#area/body stretch [repeat:: every day] [due:: 2026-10-25]"),    // 3 days late
    task(" ", "#area/occasions Ann [repeat:: every year] [due:: 2027-03-02]"),
    task(" ", "#area/occasions Bo [repeat:: every year] [due:: 2026-12-01]"),
  ]).regulars;
  assert.deepEqual(texts(regulars), ["stretch", "floss", "mask"]);
});

test("meta lines", () => {
  const m = data([task("x", "run [completion:: 2026-06-08]"), task("x", "run [completion:: 2026-05-01]"), task("-", "run [cancelled:: 2026-10-01]")]);
  assert.equal(m.backlogMeta(task(" ", "run [created:: 2026-10-16]")), "waiting 12 d  ·  done 2× · last 08.06");
  assert.equal(m.backlogMeta(task(" ", "new thing")), "");
  assert.equal(m.poolMeta({ text: "run", winxTask: T(task(" ", "run")) }), "done 2× · last 08.06 · 142 d ago");
  assert.equal(m.poolMeta(task(" ", "walk")), "never done");
  assert.equal(m.regularHistory(task(" ", "run [repeat:: every day]")), "done 2× · last 08.06 · skipped 1×");
  assert.equal(data([]).regularHistory(task(" ", "walk [repeat:: every day]")), "never done");
});

test("a task's key finds the same task again: by its line, after lines moved, never another task", async () => {
  const { taskKey, findTask } = await import("#/models/calendarData.js");
  const at = (line, status, spec) => ({ status, ...idTask(spec), path: "Tasks/Master.md", line });
  const workout = at(10, " ", "#area/body workout [due:: 2026-10-30]"), skipped = at(11, "-", "#area/body workout [due:: 2026-10-28] [cancelled:: 2026-10-28]");
  const key = taskKey(workout);
  assert.equal(findTask(key, [workout, skipped]), workout);
  // a new task on top of the file: every line one lower
  const moved = [at(0, " ", "new thing"), at(11, " ", "#area/body workout [due:: 2026-10-30]"), at(12, "-", "#area/body workout [due:: 2026-10-28] [cancelled:: 2026-10-28]")];
  assert.equal(findTask(key, moved), moved[1]);                 // the open one, not the skipped one with the same text
  assert.equal(findTask(taskKey(skipped), moved), moved[2]);
  // gone (deleted or renamed): nothing, rather than a neighbour
  assert.equal(findTask(key, [at(10, " ", "#area/body stretch")]), null);
  // a pool item (a record, no line): by its id
  const pool = poolItem("#area/base take out trash");
  assert.equal(findTask(taskKey(pool), [{ ...pool }])?.id, pool.id);
  assert.equal(findTask(taskKey(pool), [poolItem("dust")]), null);
  assert.equal(findTask("nonsense", [workout]), null);
});

test("balance: each area's tasks on the shown days (open + done, no 🔁 ghosts), how many done, in the given order", () => {
  const m = data([
    task(" ", "#⭐easy #area/body walk [due:: 2026-10-30]"),
    task("x", "#⭐⭐medium #area/body gym [completion:: 2026-10-27]"),
    task("x", "#⭐⭐⭐hard #area/mind course [completion:: 2026-10-26]"),
    task(" ", "#⭐easy #area/body stretch [repeat:: every day] [due:: 2026-10-28]"),   // today + ghosts after it
    task("x", "#⭐easy #area/body old [completion:: 2026-10-19]"),                    // last week
  ]);
  assert.deepEqual(m.balance(["body", "mind", "base"]), [
    { area: "body", planned: 3, done: 1 },
    { area: "mind", planned: 1, done: 1 },
    { area: "base", planned: 0, done: 0 },
  ]);
});

test("a day's parts: done hidden → the done ones counted as ✓N, the 🔁 ones apart (shown inside the box)", () => {
  const m = data([
    task("x", "tea [completion:: 2026-10-28]"),
    task("x", "yoga [repeat:: every day] [due:: 2026-10-28] [completion:: 2026-10-28]"),
    task(" ", "post letter [due:: 2026-10-28]"),
  ], { days: ["2026-10-28"] });
  const names = es => es.map(e => T(e.t).text);
  const hide = m.dayParts("2026-10-28", { open: true, ghost: true, done: false });
  assert.deepEqual(names(hide.rows), ["post letter"]);
  assert.deepEqual(names(hide.hidden), ["tea"]);
  assert.deepEqual(names(hide.routineHidden), ["yoga"]);
  assert.deepEqual(names(hide.routine), ["yoga"]);                 // the 🔁 pill counts all of them: 1/1
  assert.deepEqual(names(hide.routineRows), []);
  const show = m.dayParts("2026-10-28", { open: true, ghost: true, done: true });
  assert.deepEqual(names(show.rows), ["post letter", "tea"]);
  assert.deepEqual(names(show.routineRows), ["yoga"]);
  assert.deepEqual([...show.hidden, ...show.routineHidden], []);
});

test("Ahead: open dated tasks after this week, by month; in a month by date, then area; no 🔁 but birthdays", () => {
  const m = data([   // today Wed 28.10, the week ends Sun 01.11
    task(" ", "#area/body walk [due:: 2026-11-01]"),               // this week: the calendar shows it
    task(" ", "#area/mind book [due:: 2026-12-03]"),
    task(" ", "#area/body dentist [due:: 2026-12-03]"),
    task(" ", "#area/body tea [due:: 2026-12-01]"),
    task(" ", "#area/body visa [due:: 2027-02-01]"),
    task(" ", "#area/body gym [repeat:: every month] [due:: 2026-12-01]"),  // a regular: in Regulars
    task(" ", "#area/occasions Bo [repeat:: every year] [due:: 2026-12-02]"),
    task("x", "#area/body done [completion:: 2026-10-27] [due:: 2026-12-05]"),
  ]);
  assert.deepEqual(m.ahead.map(g => [g.month, texts(g.items)]), [["2026-12", ["tea", "Bo", "dentist", "book"]], ["2027-02", ["visa"]]]);
});

test("a day's parts: a task whose record has after: <id> stands right under the task with that id the same day, in its time group", () => {
  const lead = task(" ", "#time/evening треня [repeat:: every week] [due:: 2026-10-28]");
  const after = t => (t.rec.after = lead.text.split(" ")[0], t);
  const m = data([
    lead,
    task(" ", "#time/evening stretch [repeat:: every day] [due:: 2026-10-28]"),
    after(task(" ", "помыть голову [repeat:: every week] [due:: 2026-10-28]")),
    after(task(" ", "маска [repeat:: every week] [due:: 2026-10-29]")),   // no workout that day: an ordinary task
  ], { days: ["2026-10-28", "2026-10-29"] });
  const shown = { open: true, ghost: true, done: true };
  const day = m.dayParts("2026-10-28", shown).routineRows;
  assert.deepEqual(day.map(e => T(e.t).text), ["треня", "помыть голову", "stretch"]);
  assert.equal(T(day[1].follows.t).text, "треня");
  assert.equal(m.dayParts("2026-10-29", shown).routineRows[0].follows, undefined);
});

test("taskInfo: what a part shows of a task — its key, area, text, label, its sticker as an image, whether it can be skipped; once per draw", async () => {
  const { taskInfo } = await import("#/models/calendarData.js");
  const t = { ...idTask("#⭐easy #area/body stretch ![[fist.webp|28]] [repeat:: every day] [due:: 2026-11-03]"), status: " ", path: "Tasks/Master.md", line: 4 };
  let lookups = 0;
  const app = {
    metadataCache: { getFirstLinkpathDest: (name, from) => (lookups++, name === "fist.webp" ? { path: `Assets/${name}` } : null) },
    vault: { getResourcePath: f => `app://${f.path}` },
  };
  const ctx = { infos: new Map(), config: { areaIcons: { "body": "🌺" }, areaColors: { body: "#e8609a" } }, actions: { canSkip: () => true } };
  const i = taskInfo(t, ctx, app);
  assert.deepEqual({ ...i, key: typeof i.key }, { key: "string", area: "body", color: "#e8609a", difficulty: "easy", goal: false, text: "stretch", pool: false, label: "🌺 stretch", sticker: "app://Assets/fist.webp", canSkip: true, daytime: null });
  assert.equal(taskInfo(t, ctx, app), i);   // the same object again, no new lookups
  assert.equal(lookups, 1);
});

test("a day's open task goes before or after another only in its own group and file", () => {
  const a = task(" ", "a [due:: 2026-10-28]"), b = task(" ", "b [due:: 2026-10-28]");
  const morning = task(" ", "tea #time/morning [repeat:: every day] [due:: 2026-10-28]");
  const morning2 = task(" ", "walk #time/morning [repeat:: every day] [due:: 2026-10-28]");
  const evening = task(" ", "read #time/evening [repeat:: every day] [due:: 2026-10-28]");
  const other = task(" ", "plants [repeat:: every week] [due:: 2026-10-28]");
  const follower = task(" ", "c [due:: 2026-10-28]");
  follower.rec.after = "t999";
  const elsewhere = { ...task(" ", "d [due:: 2026-10-28]"), path: "Daily Notes/2026-10-28.md" };
  assert.equal(canReorder(a, b), true);
  assert.equal(canReorder(morning, morning2), true);
  assert.equal(canReorder(a, a), false);
  assert.equal(canReorder(a, { ...a }), false);   // the same task from a later draw (by id)
  assert.equal(canReorder(a, morning), false);
  assert.equal(canReorder(morning, evening), false);
  assert.equal(canReorder(evening, other), false);
  assert.equal(canReorder(follower, a), false);
  assert.equal(canReorder(a, follower), false);
  assert.equal(canReorder(task(" ", "x #time/morning [due:: 2026-10-28]"), task(" ", "y [due:: 2026-10-28]")), false);
  assert.equal(canReorder(a, elsewhere), true);   // another file: the order is not in the line
  assert.equal(canReorder(a, { status: " ", text: "x [due:: 2026-10-28]", path: b.path, line: 99 }), false);   // no id
});

test("a day's open tasks go by their record's order, those without one after, in file order", () => {
  const [a, b, c, d] = ["a", "b", "c", "d"].map(x => task(" ", `${x} [due:: 2026-10-28]`));
  b.rec.order = 0; a.rec.order = 1;
  assert.deepEqual(texts(data([a, c, b, d]).byDay[TODAY].map(e => e.t)), ["b", "a", "c", "d"]);
});

test("canReorder: a subtask only among its siblings (same parent)", () => {
  const parent = task(" ", "plan");
  const sub = { ...task(" ", "step"), parent: parent.line }, sub2 = { ...task(" ", "step 2"), parent: parent.line };
  assert.equal(canReorder(sub, sub2), true);
  assert.equal(canReorder(parent, sub), false);
  assert.equal(canReorder(sub, parent), false);
});

test("a day's one-offs go morning, none, evening, then by order; the 🔁 box keeps its groups", () => {
  const late = task(" ", "late #time/evening [due:: 2026-10-28]");
  const plain = task(" ", "plain [due:: 2026-10-28]");
  const early = task(" ", "early #time/morning [due:: 2026-10-28]");
  const early2 = task(" ", "early2 #time/morning [due:: 2026-10-28]");
  early2.rec.order = 0;
  assert.deepEqual(texts(data([late, plain, early, early2]).byDay[TODAY].map(e => e.t)), ["early2", "early", "plain", "late"]);
});

test("taskInfo: a one-off's time is shown, a 🔁 task's is left to its box heading", async () => {
  const { taskInfo } = await import("#/models/calendarData.js");
  const app = { metadataCache: { getFirstLinkpathDest: () => null }, vault: {} };
  const ctx = { infos: new Map(), config: { areaIcons: {}, areaColors: {} }, actions: { canSkip: () => false } };
  assert.equal(taskInfo(task(" ", "tea #time/evening [due:: 2026-10-28]"), ctx, app).daytime, "evening");
  assert.equal(taskInfo(task(" ", "run #time/evening [repeat:: every day] [due:: 2026-10-28]"), ctx, app).daytime, null);
});

test("a follower can stay after either member of an alternating pair", () => {
  for (const id of ["t900", "t901"]) {
    const lead = { status: " ", text: `${id} [repeat:: every day] [due:: ${TODAY}]`, rec: { name: "Workout" }, path: "Tasks/Master.md", line: 0 };
    const follower = { status: " ", text: `t902 [repeat:: every day] [due:: ${TODAY}]`, rec: { name: "After workout", after: ["t900", "t901"] }, path: lead.path, line: 1 };
    const m = data([follower, lead]);
    const rows = m.dayParts(TODAY, { open: true, ghost: true, done: true }).routineRows;
    assert.deepEqual(rows.map(e => T(e.t).id), [id, "t902"]);
    assert.equal(rows[1].follows, rows[0]);
  }
});
