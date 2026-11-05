import { test } from "node:test";
import assert from "node:assert/strict";
import { weekOf } from "#/helpers/dates.js";
import { T, CalendarData, canReorder } from "#/models/calendarData.js";

// Dataview-like tasks: { status, text, path, line }
let n = 0;
const task = (status, text) => ({ status, text, path: "Tasks/Master.md", line: n++ });
const texts = list => list.map(t => T(t).text);
const TODAY = "2026-10-28";   // a Wednesday
const AREAS = ["#area/body", "#area/mind", "#area/base"];
const data = (tasks, { poolLines = [], days = weekOf(TODAY) } = {}) => new CalendarData({ tasks, poolLines, days, today: TODAY, areaOrder: AREAS });

test("days: open on their date, done on their ✅ date, 🔁 repeats faded in the future only", () => {
  const m = data([   // the week 26.10 … 01.11
    task(" ", "#area/body walk 📅 2026-10-30"),
    task("x", "#area/mind read ✅ 2026-10-27"),
    task(" ", "#area/body stretch 🔁 every day 📅 2026-10-28"),
    task(" ", "#area/base call bank 📅 2026-10-20"),          // overdue: not on the days
    task(" ", "#area/base plan trip"),                        // no date: the backlog
    task(" ", "#area/body mask 🔁 every 3 days when done"),   // paused regular: neither
    task("-", "#area/body stretch 🔁 every day 📅 2026-10-26 ❌ 2026-10-26"),
  ]);
  assert.deepEqual(m.byDay["2026-10-30"].map(e => [T(e.t).text, e.kind]), [["walk", "open"], ["stretch", "ghost"]]);
  assert.deepEqual(m.byDay["2026-10-27"].map(e => [T(e.t).text, e.kind]), [["read", "done"]]);
  assert.deepEqual(m.byDay["2026-10-28"].map(e => [T(e.t).text, e.kind]), [["stretch", "open"]]);   // no ghost today
  assert.equal(m.byDay["2026-10-20"], undefined);
  assert.ok(!Object.values(m.byDay).flat().some(e => T(e.t).text === "call bank"));
  assert.deepEqual(texts(m.backlog), ["plan trip"]);
  assert.deepEqual(texts(m.regulars), ["stretch", "mask"]);
  assert.deepEqual(m.done.map(t => t.text), ["read"]);
  assert.deepEqual(m.skips.map(t => t.text), ["stretch"]);
});

test("a day lists open, then repeats, then done", () => {
  const m = data([
    task("x", "tea ✅ 2026-10-29"),
    task(" ", "yoga 🔁 every day 📅 2026-10-28"),
    task(" ", "post letter 📅 2026-10-29"),
  ]);
  assert.deepEqual(m.byDay["2026-10-29"].map(e => e.kind), ["open", "ghost", "done"]);
});

test("pool lines become pool items with their own Task", () => {
  const m = data([], { poolLines: [{ text: "#⭐easy #area/base take out trash", path: "Tasks/Pool.md", line: 2 }] });
  assert.equal(m.pool.length, 1);
  assert.ok(m.pool[0].pool);
  assert.equal(T(m.pool[0]).text, "take out trash");
  assert.equal(T(m.pool[0]).line, "- #⭐easy #area/base take out trash");
  assert.ok(m.all.includes(m.pool[0]));   // a data-task key finds pool items too
});

test("missed: open tasks whose day has passed, the latest first", () => {
  const m = data([
    task(" ", "a 📅 2026-10-20"), task(" ", "b 📅 2026-10-27"), task(" ", "c 📅 2026-10-28"),
    task("x", "d 📅 2026-10-21 ✅ 2026-10-21"), task(" ", "e"),
  ]);
  assert.deepEqual(texts(m.missed), ["b", "a"]);
});

test("No date: by area, then the longest waiting", () => {
  const m = data([
    task(" ", "#area/mind learn ➕ 2026-10-01"),
    task(" ", "#area/body run ➕ 2026-10-20"),
    task(" ", "#area/body swim ➕ 2026-09-01"),
    task(" ", "#area/other tidy"),
  ]);
  assert.deepEqual(texts(m.backlog), ["swim", "run", "learn", "tidy"]);
});

test("Pool: by area, then the longest since last done (never done first)", () => {
  const m = data([task("x", "dust ✅ 2026-10-01"), task("x", "vacuum ✅ 2026-09-01")], { days: [TODAY], poolLines: [
    { text: "#area/base dust", path: "P", line: 0 }, { text: "#area/base vacuum", path: "P", line: 1 },
    { text: "#area/base wash windows", path: "P", line: 2 }, { text: "#area/body run", path: "P", line: 3 },
  ] });
  assert.deepEqual(texts(m.pool), ["run", "wash windows", "vacuum", "dust"]);
});

test("Regulars: by area, dated before paused, the most overdue first; birthdays go to Ahead", () => {
  const regulars = data([
    task("x", "floss ✅ 2026-10-27"),
    task(" ", "#area/body floss 🔁 every day 📅 2026-10-28"),
    task(" ", "#area/body mask 🔁 every week"),                    // paused
    task(" ", "#area/body stretch 🔁 every day 📅 2026-10-25"),    // 3 days late
    task(" ", "#area/occasions Ann 🔁 every year 📅 2027-03-02"),
    task(" ", "#area/occasions Bo 🔁 every year 📅 2026-12-01"),
  ]).regulars;
  assert.deepEqual(texts(regulars), ["stretch", "floss", "mask"]);
});

test("meta lines", () => {
  const m = data([task("x", "run ✅ 2026-06-08"), task("x", "run ✅ 2026-05-01"), task("-", "run ❌ 2026-10-01")]);
  assert.equal(m.backlogMeta(task(" ", "run ➕ 2026-10-16")), "waiting 12 d  ·  done 2× · last 08.06");
  assert.equal(m.backlogMeta(task(" ", "new thing")), "");
  assert.equal(m.poolMeta({ text: "run", winxTask: T(task(" ", "run")) }), "done 2× · last 08.06 · 142 d ago");
  assert.equal(m.poolMeta(task(" ", "walk")), "never done");
  assert.equal(m.regularHistory(task(" ", "run 🔁 every day")), "done 2× · last 08.06 · skipped 1×");
  assert.equal(data([]).regularHistory(task(" ", "walk 🔁 every day")), "never done");
});

test("a task's key finds the same task again: by its line, after lines moved, never another task", async () => {
  const { taskKey, findTask } = await import("#/models/calendarData.js");
  const at = (line, status, text) => ({ status, text, path: "Tasks/Master.md", line });
  const workout = at(10, " ", "#area/body workout 📅 2026-10-30"), skipped = at(11, "-", "#area/body workout 📅 2026-10-28 ❌ 2026-10-28");
  const key = taskKey(workout);
  assert.equal(findTask(key, [workout, skipped]), workout);
  // a new task on top of the file: every line one lower
  const moved = [at(0, " ", "new thing"), at(11, " ", "#area/body workout 📅 2026-10-30"), at(12, "-", "#area/body workout 📅 2026-10-28 ❌ 2026-10-28")];
  assert.equal(findTask(key, moved), moved[1]);                 // the open one, not the skipped one with the same text
  assert.equal(findTask(taskKey(skipped), moved), moved[2]);
  // gone (deleted or renamed): nothing, rather than a neighbour
  assert.equal(findTask(key, [at(10, " ", "#area/body stretch")]), null);
  // a pool item (no checkbox)
  const pool = { text: "#area/base take out trash", path: "Tasks/Pool.md", line: 2, pool: true };
  assert.equal(findTask(taskKey(pool), [{ ...pool, line: 3 }]).line, 3);
  assert.equal(findTask("nonsense", [workout]), null);
});

test("balance: each area's tasks on the shown days (open + done, no 🔁 ghosts), how many done, in the given order", () => {
  const m = data([
    task(" ", "#⭐easy #area/body walk 📅 2026-10-30"),
    task("x", "#⭐⭐medium #area/body gym ✅ 2026-10-27"),
    task("x", "#⭐⭐⭐hard #area/mind course ✅ 2026-10-26"),
    task(" ", "#⭐easy #area/body stretch 🔁 every day 📅 2026-10-28"),   // today + ghosts after it
    task("x", "#⭐easy #area/body old ✅ 2026-10-19"),                    // last week
  ]);
  assert.deepEqual(m.balance(["#area/body", "#area/mind", "#area/base"]), [
    { area: "#area/body", planned: 3, done: 1 },
    { area: "#area/mind", planned: 1, done: 1 },
    { area: "#area/base", planned: 0, done: 0 },
  ]);
});

test("a day's parts: done hidden → the done ones counted as ✓N, the 🔁 ones apart (shown inside the box)", () => {
  const m = data([
    task("x", "tea ✅ 2026-10-28"),
    task("x", "yoga 🔁 every day 📅 2026-10-28 ✅ 2026-10-28"),
    task(" ", "post letter 📅 2026-10-28"),
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
    task(" ", "#area/body walk 📅 2026-11-01"),               // this week: the calendar shows it
    task(" ", "#area/mind book 📅 2026-12-03"),
    task(" ", "#area/body dentist 📅 2026-12-03"),
    task(" ", "#area/body tea 📅 2026-12-01"),
    task(" ", "#area/body visa 📅 2027-02-01"),
    task(" ", "#area/body gym 🔁 every month 📅 2026-12-01"),  // a regular: in Regulars
    task(" ", "#area/occasions Bo 🔁 every year 📅 2026-12-02"),
    task("x", "#area/body done ✅ 2026-10-27 📅 2026-12-05"),
  ]);
  assert.deepEqual(m.ahead.map(g => [g.month, texts(g.items)]), [["2026-12", ["tea", "Bo", "dentist", "book"]], ["2027-02", ["visa"]]]);
});

test("a day's parts: a task with #after/id/<id> stands right under the task with #id/<id> the same day, in its time group", () => {
  const m = data([
    task(" ", "#time/evening #id/workout треня 🔁 every week 📅 2026-10-28"),
    task(" ", "#time/evening stretch 🔁 every day 📅 2026-10-28"),
    task(" ", "#after/id/workout помыть голову 🔁 every week 📅 2026-10-28"),
    task(" ", "#after/id/workout маска 🔁 every week 📅 2026-10-29"),   // no workout that day: an ordinary task
  ], { days: ["2026-10-28", "2026-10-29"] });
  const shown = { open: true, ghost: true, done: true };
  const day = m.dayParts("2026-10-28", shown).routineRows;
  assert.deepEqual(day.map(e => T(e.t).text), ["треня", "помыть голову", "stretch"]);
  assert.equal(T(day[1].follows.t).text, "треня");
  assert.equal(m.dayParts("2026-10-29", shown).routineRows[0].follows, undefined);
});

test("taskInfo: what a part shows of a task — its key, area, text, label, stickers as images, whether it can be skipped; once per draw", async () => {
  const { taskInfo } = await import("#/models/calendarData.js");
  const t = { text: "#⭐easy #area/body stretch ![[fist.webp|28]] 🔁 every day 📅 2026-11-03", status: " ", path: "Tasks/Master.md", line: 4 };
  let lookups = 0;
  const app = {
    metadataCache: { getFirstLinkpathDest: (name, from) => (lookups++, name === "fist.webp" ? { path: `Assets/${name}` } : null) },
    vault: { getResourcePath: f => `app://${f.path}` },
  };
  const ctx = { infos: new Map(), config: { areaIcons: { "#area/body": "🌺" } }, actions: { canSkip: () => true } };
  const i = taskInfo(t, ctx, app);
  assert.deepEqual({ ...i, key: typeof i.key }, { key: "string", area: "body", difficulty: "#⭐easy", text: "stretch", pool: false, label: "🌺 stretch", stickers: ["app://Assets/fist.webp"], canSkip: true });
  assert.equal(taskInfo(t, ctx, app), i);   // the same object again, no new lookups
  assert.equal(lookups, 1);
});

test("a day's open task goes before or after another only in its own group and file", () => {
  const a = task(" ", "a 📅 2026-10-28"), b = task(" ", "b 📅 2026-10-28");
  const morning = task(" ", "tea #time/morning 🔁 every day 📅 2026-10-28");
  const morning2 = task(" ", "walk #time/morning 🔁 every day 📅 2026-10-28");
  const evening = task(" ", "read #time/evening 🔁 every day 📅 2026-10-28");
  const other = task(" ", "plants 🔁 every week 📅 2026-10-28");
  const follower = task(" ", "c #after/id/x 📅 2026-10-28");
  const elsewhere = { ...task(" ", "d 📅 2026-10-28"), path: "Daily Notes/2026-10-28.md" };
  assert.equal(canReorder(a, b), true);
  assert.equal(canReorder(morning, morning2), true);
  assert.equal(canReorder(a, a), false);
  assert.equal(canReorder(a, morning), false);
  assert.equal(canReorder(morning, evening), false);
  assert.equal(canReorder(evening, other), false);
  assert.equal(canReorder(follower, a), false);
  assert.equal(canReorder(a, follower), false);
  assert.equal(canReorder(a, elsewhere), false);
});

test("canReorder: a subtask only among its siblings (same parent)", () => {
  const parent = task(" ", "plan");
  const sub = { ...task(" ", "step"), parent: parent.line }, sub2 = { ...task(" ", "step 2"), parent: parent.line };
  assert.equal(canReorder(sub, sub2), true);
  assert.equal(canReorder(parent, sub), false);
  assert.equal(canReorder(sub, parent), false);
});
