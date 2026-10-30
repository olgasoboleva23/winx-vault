import { test } from "node:test";
import assert from "node:assert/strict";
import { weekOf } from "../src/lib/dates.js";
import { T, CalendarData } from "../src/calendar/data.js";

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
  assert.deepEqual(texts(m.regulars.rest), ["stretch", "mask"]);
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

test("Regulars: by area, dated before paused, the most overdue first; birthdays apart by next date", () => {
  const { rest, bdays } = data([
    task("x", "floss ✅ 2026-10-27"),
    task(" ", "#area/body floss 🔁 every day 📅 2026-10-28"),
    task(" ", "#area/body mask 🔁 every week"),                    // paused
    task(" ", "#area/body stretch 🔁 every day 📅 2026-10-25"),    // 3 days late
    task(" ", "#area/occasions Ann 🔁 every year 📅 2027-03-02"),
    task(" ", "#area/occasions Bo 🔁 every year 📅 2026-12-01"),
  ]).regulars;
  assert.deepEqual(texts(rest), ["stretch", "floss", "mask"]);
  assert.deepEqual(texts(bdays), ["Bo", "Ann"]);
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
  const { taskKey, findTask } = await import("../src/calendar/data.js");
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
