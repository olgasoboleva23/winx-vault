import { test } from "node:test";
import assert from "node:assert/strict";
import { Task, fieldsOf, taskChoices } from "#/models/task.js";

const T = line => new Task(line);

test("what a line is", () => {
  const t = T("- [ ] #⭐⭐medium #area/body #time/evening #goal/workout gym ![[fairy.png|28]] ![[bloom.gif|28]] [repeat:: every week on Monday, Friday when done] [due:: 2026-10-28] [created:: 2026-05-01]");
  assert.equal(t.status, " ");
  assert.ok(t.isOpen && !t.isDone && !t.isSkipped);
  assert.equal(t.area, "#area/body");
  assert.equal(t.difficulty, "#⭐⭐medium");
  assert.equal(t.time, "evening");
  assert.equal(t.rule, "every week on Monday, Friday when done");
  assert.ok(t.isRecurring && t.whenDone && !t.isBirthday && !t.isPaused);
  assert.equal(t.date, "2026-10-28");
  assert.equal(t.created, "2026-05-01");
  assert.deepEqual(t.stickers, ["fairy.png", "bloom.gif"]);
  assert.equal(t.text, "gym");

  const plain = T("- [x] call bank [scheduled:: 2026-10-20] [due:: 2026-10-22] [completion:: 2026-10-21]");
  assert.ok(plain.isDone && !plain.isRecurring);
  assert.equal(plain.date, "2026-10-20");   // an old ⏳ wins
  assert.equal(plain.doneOn, "2026-10-21");
  assert.equal(plain.area, null);
  assert.equal(plain.difficulty, null);
  assert.equal(plain.time, null);
  assert.deepEqual(plain.stickers, []);

  assert.ok(T("- [ ] stretch [repeat:: every day] [created:: 2026-05-01]").isPaused);
  assert.ok(T("- [ ] #area/occasions birthday [repeat:: every year] [due:: 2027-04-23]").isBirthday);
  const skipped = T("- [-] stretch [repeat:: every 2 days when done] [due:: 2026-10-28] [cancelled:: 2026-10-28]");
  assert.ok(skipped.isSkipped && !skipped.isOpen && !skipped.isDone);
  assert.equal(skipped.skippedOn, "2026-10-28");
  assert.equal(skipped.rule, "every 2 days when done");
});

test("Task.of wraps a Dataview task", () => {
  const src = { status: "x", text: "#⭐easy walk [completion:: 2026-10-27]", path: "Tasks.md", line: 3 };
  const t = Task.of(src);
  assert.ok(t.isDone);
  assert.equal(t.src, src);
  assert.equal(t.text, "walk");
});

test("key", () => {
  assert.equal(T("#⭐easy #area/base Water plants [due:: 2026-10-01] [completion:: 2026-10-02]").key, "water plants");
  // a raw file line and the task text must give the same key
  assert.equal(T("- [ ] #⭐easy water plants [scheduled:: 2026-10-26]").key, T("#⭐easy water plants").key);
  assert.equal(T("  - [x] Water plants [completion:: 2026-10-02]").key, "water plants");
  assert.equal(T("- [ ] #goal/x workout ![[mikasa.png|28]] [repeat:: every day] [due:: 2026-10-28]").key, "workout");
  assert.equal(Task.keyOf("- [-] workout [repeat:: every day] [due:: 2026-10-28] [cancelled:: 2026-10-28]"), "workout");
});

test("setDue", () => {
  assert.equal(T("- [ ] #⭐easy water plants").setDue("2026-10-26"), "- [ ] #⭐easy water plants [due:: 2026-10-26]");
  assert.equal(T("- [ ] call bank [scheduled:: 2026-10-01] [due:: 2026-11-01]").setDue("2026-10-26"), "- [ ] call bank [due:: 2026-10-26]");   // one date: ⏳ goes
  assert.equal(T("- [ ] call bank [due:: 2026-10-01]").setDue(null), "- [ ] call bank");          // no date
  assert.equal(T("not a task").setDue("2026-10-26"), "not a task");
});

test("place", () => {
  assert.equal(T("- [ ] water plants [scheduled:: 2026-10-26]").place("2026-10-25", true), "- [x] water plants [scheduled:: 2026-10-26] [completion:: 2026-10-25]");
  assert.equal(T("- [x] call bank [completion:: 2026-10-26]").place("2026-10-25", true), "- [x] call bank [completion:: 2026-10-25]");
  assert.equal(T("- [x] call bank [due:: 2026-10-20] [completion:: 2026-10-26]").place("2026-10-28", false), "- [ ] call bank [due:: 2026-10-28]");
  assert.equal(T("- [ ] call bank [due:: 2026-10-20]").place(null, false), "- [ ] call bank");   // back to the backlog
  assert.equal(T("not a task").place("2026-10-25", true), "not a task");
});

test("setTag, setSticker, picks", () => {
  const line = "- [ ] #⭐easy #area/base wash windows [repeat:: every month] [due:: 2026-11-01] [created:: 2026-10-29]";
  assert.equal(T(line).setTag("#time/", "#time/morning"), "- [ ] #⭐easy #area/base #time/morning wash windows [repeat:: every month] [due:: 2026-11-01] [created:: 2026-10-29]");
  assert.equal(T(line).setTag("#area/", "#area/body"), "- [ ] #⭐easy #area/body wash windows [repeat:: every month] [due:: 2026-11-01] [created:: 2026-10-29]");
  assert.equal(T(line).setTag("#area/", null), "- [ ] #⭐easy wash windows [repeat:: every month] [due:: 2026-11-01] [created:: 2026-10-29]");
  assert.equal(T(line).setSticker("levi.png"), "- [ ] #⭐easy #area/base wash windows ![[levi.png|28]] [repeat:: every month] [due:: 2026-11-01] [created:: 2026-10-29]");
  assert.equal(T("- [ ] call bank").setSticker("levi.png"), "- [ ] call bank ![[levi.png|28]]");
  assert.equal(T("- [ ] call bank [created:: 2026-10-29]").setSticker("levi.png"), "- [ ] call bank ![[levi.png|28]] [created:: 2026-10-29]");
  const two = "- [ ] gym ![[a.png|28]] ![[b.gif|28]] [due:: 2026-10-30]";
  assert.equal(T(two).setSticker("c.png"), "- [ ] gym ![[c.png|28]] ![[b.gif|28]] [due:: 2026-10-30]");   // only the first
  assert.equal(T(two).setSticker(null), "- [ ] gym ![[b.gif|28]] [due:: 2026-10-30]");
  const t = T("- [ ] #⭐easy #area/mind #time/morning meditate ![[bloom.gif|28]] [repeat:: every day]");
  assert.deepEqual(t.picks, { difficulty: "#⭐easy", area: "#area/mind", time: "#time/morning", sticker: "bloom.gif" });
  assert.equal(t.withPicks({ time: null, sticker: "rings.gif" }), "- [ ] #⭐easy #area/mind meditate ![[rings.gif|28]] [repeat:: every day]");
  assert.equal(t.withPicks({}), t.line);
});

test("pool lines", () => {
  const pool = "- #⭐easy #area/base take out trash ![[levi.png|28]]";
  assert.equal(T(pool).text, "take out trash");
  assert.equal(T(pool).key, T("- [x] #⭐easy take out trash [completion:: 2026-10-27]").key);   // its copies share its history
  assert.equal(T("- [ ] #⭐easy #area/base take out trash ![[levi.png|28]] [repeat:: every day] [due:: 2026-10-30]  [created:: 2026-10-29]").poolLine, pool);
  const copy = Task.fromPool(pool, "2026-10-29");
  assert.equal(copy, "- [ ] #⭐easy #area/base take out trash ![[levi.png|28]] [created:: 2026-10-29]");
  assert.equal(T(copy).place("2026-10-30", false), copy + " [due:: 2026-10-30]");
});

test("pause / resume", () => {
  const line = "- [ ] mask [repeat:: every 3 days when done] [scheduled:: 2026-10-20] [due:: 2026-10-22] [created:: 2026-05-01]";
  assert.equal(T(line).pause(), "- [ ] mask [repeat:: every 3 days when done] [created:: 2026-05-01]");
  assert.equal(T(T(line).pause()).resume("2026-10-27"), "- [ ] mask [repeat:: every 3 days when done] [created:: 2026-05-01] [due:: 2026-10-27]");
  // weekday rule: the next allowed day from today (2026-10-27 is a Tuesday)
  assert.equal(T("- [ ] gym [repeat:: every week on Monday, Wednesday, Friday when done]").resume("2026-10-27"), "- [ ] gym [repeat:: every week on Monday, Wednesday, Friday when done] [due:: 2026-10-28]");
  assert.equal(T("- [ ] code [repeat:: every week on Tuesday, Thursday]").resume("2026-10-27"), "- [ ] code [repeat:: every week on Tuesday, Thursday] [due:: 2026-10-27]");
});

test("backdateDone", () => {
  const ticked = "- [ ] stretch [repeat:: every 3 days when done] [due:: 2026-10-29]\n- [x] stretch [repeat:: every 3 days when done] [due:: 2026-10-25] [completion:: 2026-10-26]";
  assert.equal(Task.backdateDone(ticked, "2026-10-25", "2026-10-26"),
    "- [ ] stretch [repeat:: every 3 days when done] [due:: 2026-10-28]\n- [x] stretch [repeat:: every 3 days when done] [due:: 2026-10-25] [completion:: 2026-10-25]");
  const fixed = "- [ ] gym [repeat:: every week on Monday] [due:: 2026-11-02]\n- [x] gym [repeat:: every week on Monday] [due:: 2026-10-26] [completion:: 2026-10-26]";
  assert.equal(Task.backdateDone(fixed, "2026-10-25", "2026-10-26"),
    "- [ ] gym [repeat:: every week on Monday] [due:: 2026-11-02]\n- [x] gym [repeat:: every week on Monday] [due:: 2026-10-26] [completion:: 2026-10-25]");   // fixed schedule: next copy stays
  assert.equal(Task.backdateDone("- [x] plain [scheduled:: 2026-10-25] [completion:: 2026-10-26]", "2026-10-25", "2026-10-26"), "- [x] plain [scheduled:: 2026-10-25] [completion:: 2026-10-25]");
});

test("skipLines", () => {
  const ticked = "- [ ] stretch [repeat:: every 3 days when done] [due:: 2026-10-29]\n- [x] stretch [repeat:: every 3 days when done] [due:: 2026-10-25] [completion:: 2026-10-26]";
  const skipped = Task.skipLines(ticked);
  assert.equal(skipped, "- [ ] stretch [repeat:: every 3 days when done] [due:: 2026-10-29]\n- [-] stretch [repeat:: every 3 days when done] [due:: 2026-10-25] [cancelled:: 2026-10-26]");
  assert.equal(Task.keyOf(skipped.split("\n")[1]), Task.keyOf(ticked.split("\n")[0]));   // still the same task for history
});

test("skipLines of a missed copy: the next one on the first day from today its rule allows, today included", () => {
  const T = l => new Task(l);
  // Tasks moved "every day when done" to tomorrow and the weekday rule to the next Wednesday: from today instead
  assert.equal(Task.skipLines("- [ ] walk [repeat:: every day when done] [due:: 2026-11-08]\n- [x] walk [repeat:: every day when done] [due:: 2026-11-04] [completion:: 2026-11-07]", "2026-11-07"),
    "- [ ] walk [repeat:: every day when done] [due:: 2026-11-07]\n- [-] walk [repeat:: every day when done] [due:: 2026-11-04] [cancelled:: 2026-11-07]");
  assert.equal(Task.skipLines("- [ ] gym [repeat:: every week on Monday, Wednesday when done] [due:: 2026-11-11]\n- [x] gym [repeat:: every week on Monday, Wednesday when done] [due:: 2026-11-06] [completion:: 2026-11-09]", "2026-11-09"),
    "- [ ] gym [repeat:: every week on Monday, Wednesday when done] [due:: 2026-11-09]\n- [-] gym [repeat:: every week on Monday, Wednesday when done] [due:: 2026-11-06] [cancelled:: 2026-11-09]");
  // the 1st of a month, a year: the rule's own next stays
  assert.equal(Task.skipLines("- [ ] rent [repeat:: every month on the 1st] [due:: 2026-12-01]\n- [x] rent [repeat:: every month on the 1st] [due:: 2026-11-01] [completion:: 2026-11-07]", "2026-11-07").split("\n")[0],
    "- [ ] rent [repeat:: every month on the 1st] [due:: 2026-12-01]");
  assert.equal(T("- [ ] x [repeat:: every 3 days when done] [due:: 2026-11-01]").firstDay("2026-11-07"), "2026-11-07");
  assert.equal(T("- [ ] x [repeat:: every 2 weeks on Saturday] [due:: 2026-11-01]").firstDay("2026-11-07"), "2026-11-07");
  assert.equal(T("- [ ] x [repeat:: every year] [due:: 2026-11-01]").firstDay("2026-11-07"), null);
});

test("pause state, skipping and overdue are the task's own", () => {
  const open = new Task("- [ ] walk [repeat:: every day] [due:: 2026-10-20]"), paused = new Task("- [ ] walk [repeat:: every week on Monday]");
  assert.equal(open.isPaused, false); assert.equal(paused.isPaused, true);
  assert.equal(open.togglePause("2026-10-28"), "- [ ] walk [repeat:: every day]");                          // pause: dates go
  assert.equal(paused.togglePause("2026-10-28"), "- [ ] walk [repeat:: every week on Monday] [due:: 2026-11-02]"); // resume: its next day
  assert.equal(open.canSkip, true);                                                              // a dated 🔁 one
  assert.equal(paused.canSkip, false);
  assert.equal(new Task("- [ ] call [due:: 2026-10-20]").canSkip, false);                              // not a repeat
  assert.equal(open.isOverdue("2026-10-28"), true);
  assert.equal(open.isOverdue("2026-10-20"), false);
  assert.equal(new Task("- [x] call [due:: 2026-10-20] [completion:: 2026-10-21]").isOverdue("2026-10-28"), false);
  assert.equal(paused.isOverdue("2026-10-28"), false);
});

test("taskChoices: one per task, by area, the most done first; the picks of its latest line", () => {
  const c = taskChoices([
    "- [x] #⭐easy #area/base wash dishes [completion:: 2026-10-01]",
    "- [x] #⭐⭐medium #area/base #time/evening Wash dishes ![[cat.png|28]] [completion:: 2026-10-20]",
    "- [ ] #⭐easy #area/body stretch [due:: 2026-11-01]",
    "- #⭐⭐medium #area/base take out trash",
    "- [x] #⭐easy #area/body stretch [completion:: 2026-09-01]",
  ], ["#area/body", "#area/base"]);
  assert.deepEqual(c.map(x => [x.name, x.area, x.done, x.last]), [
    ["stretch", "#area/body", 1, "2026-09-01"],
    ["Wash dishes", "#area/base", 2, "2026-10-20"],
    ["take out trash", "#area/base", 0, null],
  ]);
  assert.deepEqual(c[1].picks, { difficulty: "#⭐⭐medium", area: "#area/base", time: "#time/evening", sticker: "cat.png" });
});

test("#id/<id> and #after/id/<id>: a task's id and the one it comes after, not part of the words", () => {
  const t = T("- [ ] #⭐easy #area/body #after/id/workout помыть голову [repeat:: every week on Monday when done] [due:: 2026-11-04]");
  assert.equal(t.after, "workout");
  assert.equal(t.text, "помыть голову");
  assert.equal(T("- [ ] #id/workout треня").id, "workout");
  assert.equal(T("- [ ] треня").after, null);
  assert.equal(T("- [ ] треня").id, null);
});

test("sameAs: the same copy of a task (words, status, day), not its done copy or another day's", () => {
  const open = new Task("- [ ] workout [repeat:: every day] [due:: 2026-10-28]");
  assert.ok(open.sameAs(new Task("  - [ ] #⭐easy workout [repeat:: every day] [due:: 2026-10-28]")));
  assert.ok(!open.sameAs(new Task("- [x] workout [repeat:: every day] [due:: 2026-10-28] [completion:: 2026-10-28]")));
  assert.ok(!open.sameAs(new Task("- [ ] workout [repeat:: every day] [due:: 2026-10-29]")));
});

test("Task.of a pool item (no checkbox) is its pool line, so its line is found again", () => {
  const p = { text: "#⭐easy #area/base take out trash", pool: true };
  assert.ok(Task.of(p).sameAs(new Task("- #⭐easy #area/base take out trash")));
});

test("fieldsOf reads every field, a rule with words up to its ]", () => {
  assert.deepEqual(fieldsOf("- [ ] t1 [repeat:: every week on Monday, Friday] [due:: 2026-11-09]"),
    { repeat: "every week on Monday, Friday", due: "2026-11-09" });
});
