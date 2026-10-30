import { test } from "node:test";
import assert from "node:assert/strict";
import { Task } from "../src/lib/task.js";

const T = line => new Task(line);

test("what a line is", () => {
  const t = T("- [ ] #⭐⭐medium #area/body #time/evening #goal/workout gym ![[fairy.png|28]] ![[bloom.gif|28]] 🔁 every week on Monday, Friday when done 📅 2026-10-28 ➕ 2026-05-01");
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

  const plain = T("- [x] call bank ⏳ 2026-10-20 📅 2026-10-22 ✅ 2026-10-21");
  assert.ok(plain.isDone && !plain.isRecurring);
  assert.equal(plain.date, "2026-10-20");   // an old ⏳ wins
  assert.equal(plain.doneOn, "2026-10-21");
  assert.equal(plain.area, null);
  assert.equal(plain.difficulty, null);
  assert.equal(plain.time, null);
  assert.deepEqual(plain.stickers, []);

  assert.ok(T("- [ ] stretch 🔁 every day ➕ 2026-05-01").isPaused);
  assert.ok(T("- [ ] #area/occasions birthday 🔁 every year 📅 2027-04-23").isBirthday);
  const skipped = T("- [-] stretch 🔁 every 2 days when done 📅 2026-10-28 ❌ 2026-10-28");
  assert.ok(skipped.isSkipped && !skipped.isOpen && !skipped.isDone);
  assert.equal(skipped.skippedOn, "2026-10-28");
  assert.equal(skipped.rule, "every 2 days when done");
});

test("Task.of wraps a Dataview task", () => {
  const src = { status: "x", text: "#⭐easy walk ✅ 2026-10-27", path: "Tasks.md", line: 3 };
  const t = Task.of(src);
  assert.ok(t.isDone);
  assert.equal(t.src, src);
  assert.equal(t.text, "walk");
});

test("key and history", () => {
  assert.equal(T("#⭐easy #area/base Water plants 📅 2026-10-01 ✅ 2026-10-02").key, "water plants");
  // a raw file line and the task text must give the same key
  assert.equal(T("- [ ] #⭐easy water plants ⏳ 2026-10-26").key, T("#⭐easy water plants").key);
  assert.equal(T("  - [x] Water plants ✅ 2026-10-02").key, "water plants");
  assert.equal(T("- [ ] #goal/x workout ![[mikasa.png|28]] 🔁 every day 📅 2026-10-28").key, "workout");
  assert.equal(Task.keyOf("- [-] workout 🔁 every day 📅 2026-10-28 ❌ 2026-10-28"), "workout");
  const done = [T("- [x] #⭐easy water plants ✅ 2026-09-01"), T("- [x] Water plants 📅 2026-10-01 ✅ 2026-10-02"), T("- [x] call bank ✅ 2026-08-01")];
  assert.deepEqual(T("water plants ⏳ 2026-10-26").history(done), { count: 2, last: "2026-10-02" });
  assert.equal(T("new thing").history(done), null);
});

test("setDue", () => {
  assert.equal(T("- [ ] #⭐easy water plants").setDue("2026-10-26"), "- [ ] #⭐easy water plants 📅 2026-10-26");
  assert.equal(T("- [ ] call bank ⏳ 2026-10-01 📅 2026-11-01").setDue("2026-10-26"), "- [ ] call bank 📅 2026-10-26");   // one date: ⏳ goes
  assert.equal(T("- [ ] call bank 📅 2026-10-01").setDue(null), "- [ ] call bank");          // no date
  assert.equal(T("not a task").setDue("2026-10-26"), "not a task");
});

test("place", () => {
  assert.equal(T("- [ ] water plants ⏳ 2026-10-26").place("2026-10-25", true), "- [x] water plants ⏳ 2026-10-26 ✅ 2026-10-25");
  assert.equal(T("- [x] call bank ✅ 2026-10-26").place("2026-10-25", true), "- [x] call bank ✅ 2026-10-25");
  assert.equal(T("- [x] call bank 📅 2026-10-20 ✅ 2026-10-26").place("2026-10-28", false), "- [ ] call bank 📅 2026-10-28");
  assert.equal(T("- [ ] call bank 📅 2026-10-20").place(null, false), "- [ ] call bank");   // back to the backlog
  assert.equal(T("not a task").place("2026-10-25", true), "not a task");
});

test("setDifficulty", () => {
  assert.equal(T("- [ ] #⭐easy #area/body walk 📅 2026-10-27").setDifficulty("#⭐⭐⭐hard"), "- [ ] #⭐⭐⭐hard #area/body walk 📅 2026-10-27");
  assert.equal(T("- [ ] #area/body walk").setDifficulty("#⭐⭐medium"), "- [ ] #⭐⭐medium #area/body walk");
  assert.equal(T("- [ ] #⭐⭐medium #area/body walk").setDifficulty(null), "- [ ] #area/body walk");
  assert.equal(T("  - [x] walk #⭐easy ✅ 2026-10-27").setDifficulty("#⭐⭐⭐⭐epic"), "  - [x] walk #⭐⭐⭐⭐epic ✅ 2026-10-27");
});

test("setTag, setSticker, picks", () => {
  const line = "- [ ] #⭐easy #area/base wash windows 🔁 every month 📅 2026-11-01 ➕ 2026-10-29";
  assert.equal(T(line).setTag("#time/", "#time/morning"), "- [ ] #⭐easy #area/base #time/morning wash windows 🔁 every month 📅 2026-11-01 ➕ 2026-10-29");
  assert.equal(T(line).setTag("#area/", "#area/body"), "- [ ] #⭐easy #area/body wash windows 🔁 every month 📅 2026-11-01 ➕ 2026-10-29");
  assert.equal(T(line).setTag("#area/", null), "- [ ] #⭐easy wash windows 🔁 every month 📅 2026-11-01 ➕ 2026-10-29");
  assert.equal(T(line).setSticker("levi.png"), "- [ ] #⭐easy #area/base wash windows ![[levi.png|28]] 🔁 every month 📅 2026-11-01 ➕ 2026-10-29");
  assert.equal(T("- [ ] call bank").setSticker("levi.png"), "- [ ] call bank ![[levi.png|28]]");
  assert.equal(T("- [ ] call bank ➕ 2026-10-29").setSticker("levi.png"), "- [ ] call bank ![[levi.png|28]] ➕ 2026-10-29");
  const two = "- [ ] gym ![[a.png|28]] ![[b.gif|28]] 📅 2026-10-30";
  assert.equal(T(two).setSticker("c.png"), "- [ ] gym ![[c.png|28]] ![[b.gif|28]] 📅 2026-10-30");   // only the first
  assert.equal(T(two).setSticker(null), "- [ ] gym ![[b.gif|28]] 📅 2026-10-30");
  const t = T("- [ ] #⭐easy #area/mind #time/morning meditate ![[bloom.gif|28]] 🔁 every day");
  assert.deepEqual(t.picks, { difficulty: "#⭐easy", area: "#area/mind", time: "#time/morning", sticker: "bloom.gif" });
  assert.equal(t.withPicks({ time: null, sticker: "rings.gif" }), "- [ ] #⭐easy #area/mind meditate ![[rings.gif|28]] 🔁 every day");
  assert.equal(t.withPicks({}), t.line);
});

test("pool lines", () => {
  const pool = "- #⭐easy #area/base take out trash ![[levi.png|28]]";
  assert.equal(T(pool).text, "take out trash");
  assert.equal(T(pool).key, T("- [x] #⭐easy take out trash ✅ 2026-10-27").key);   // its copies share its history
  assert.equal(T("- [ ] #⭐easy #area/base take out trash ![[levi.png|28]] 🔁 every day 📅 2026-10-30  ➕ 2026-10-29").poolLine, pool);
  const copy = Task.fromPool(pool, "2026-10-29");
  assert.equal(copy, "- [ ] #⭐easy #area/base take out trash ![[levi.png|28]] ➕ 2026-10-29");
  assert.equal(T(copy).place("2026-10-30", false), copy + " 📅 2026-10-30");
});

test("pause / resume", () => {
  const line = "- [ ] mask 🔁 every 3 days when done ⏳ 2026-10-20 📅 2026-10-22 ➕ 2026-05-01";
  assert.equal(T(line).pause(), "- [ ] mask 🔁 every 3 days when done ➕ 2026-05-01");
  assert.equal(T(T(line).pause()).resume("2026-10-27"), "- [ ] mask 🔁 every 3 days when done ➕ 2026-05-01 📅 2026-10-27");
  // weekday rule: the next allowed day from today (2026-10-27 is a Tuesday)
  assert.equal(T("- [ ] gym 🔁 every week on Monday, Wednesday, Friday when done").resume("2026-10-27"), "- [ ] gym 🔁 every week on Monday, Wednesday, Friday when done 📅 2026-10-28");
  assert.equal(T("- [ ] code 🔁 every week on Tuesday, Thursday").resume("2026-10-27"), "- [ ] code 🔁 every week on Tuesday, Thursday 📅 2026-10-27");
});

test("backdateDone", () => {
  const ticked = "- [ ] stretch 🔁 every 3 days when done 📅 2026-10-29\n- [x] stretch 🔁 every 3 days when done 📅 2026-10-25 ✅ 2026-10-26";
  assert.equal(Task.backdateDone(ticked, "2026-10-25", "2026-10-26"),
    "- [ ] stretch 🔁 every 3 days when done 📅 2026-10-28\n- [x] stretch 🔁 every 3 days when done 📅 2026-10-25 ✅ 2026-10-25");
  const fixed = "- [ ] gym 🔁 every week on Monday 📅 2026-11-02\n- [x] gym 🔁 every week on Monday 📅 2026-10-26 ✅ 2026-10-26";
  assert.equal(Task.backdateDone(fixed, "2026-10-25", "2026-10-26"),
    "- [ ] gym 🔁 every week on Monday 📅 2026-11-02\n- [x] gym 🔁 every week on Monday 📅 2026-10-26 ✅ 2026-10-25");   // fixed schedule: next copy stays
  assert.equal(Task.backdateDone("- [x] plain ⏳ 2026-10-25 ✅ 2026-10-26", "2026-10-25", "2026-10-26"), "- [x] plain ⏳ 2026-10-25 ✅ 2026-10-25");
});

test("skipLines", () => {
  const ticked = "- [ ] stretch 🔁 every 3 days when done 📅 2026-10-29\n- [x] stretch 🔁 every 3 days when done 📅 2026-10-25 ✅ 2026-10-26";
  const skipped = Task.skipLines(ticked);
  assert.equal(skipped, "- [ ] stretch 🔁 every 3 days when done 📅 2026-10-29\n- [-] stretch 🔁 every 3 days when done 📅 2026-10-25 ❌ 2026-10-26");
  assert.equal(Task.keyOf(skipped.split("\n")[1]), Task.keyOf(ticked.split("\n")[0]));   // still the same task for history
});
