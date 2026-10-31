import { test } from "node:test";
import assert from "node:assert/strict";
import { monthGrid, weekOf } from "../src/core/dates.js";
import { supplyStats } from "../src/widgets/market/market.js";
import { projectRepeats, ruleText } from "../src/tasks/repeats.js";
import { todayCount } from "../src/tasks/task.js";
import { levelInfo } from "../src/widgets/xp/xp.js";

// 2026-10-19 is a Monday
test("weeks", () => {
  assert.deepEqual(weekOf("2026-10-22"), ["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-25"]);
  assert.deepEqual(weekOf("2026-10-25")[0], "2026-10-19");
});

test("supplyStats", () => {
  const h = [
    { name: "Apples", tag: "#food", date: "2026-09-01" },
    { name: "apples ", tag: "#food", date: "2026-09-11" },
    { name: "apples", tag: "#food", date: "2026-09-21" },
    { name: "Rice", tag: "#food", date: "2026-06-01" },
    { name: "rice", tag: "#home", date: "2026-09-03" },
    { name: "kiwi", tag: "#food", date: "2026-06-12" },
  ];
  const s = supplyStats(h, "2026-09-30");
  assert.deepEqual(s.map(x => x.name), ["apples", "rice"]);          // bought once: not a staple
  const apples = s[0];
  assert.deepEqual([apples.buys, apples.avg, apples.since, apples.due, apples.tag], [3, 10, 9, true, "#food"]);
  const salt = s[1];
  assert.deepEqual([salt.buys, salt.avg, salt.tag], [2, null, "#home"]); // <3 buys: no forecast; last tag wins
  assert.equal(salt.due, false);
  assert.equal(supplyStats(h, "2026-09-25")[0].due, false);        // 4 of 10 days
});

test("todayCount", () => {
  const d = "2026-10-23";
  const tasks = [
    { done: false, recurring: false, scheduled: "2026-10-23" },             // today pick
    { done: false, recurring: false, scheduled: "2026-10-24" },             // future pick
    { done: false, recurring: true,  due: "2026-10-20" },                   // routine left from earlier
    { done: false, recurring: true,  due: "2026-10-25" },                   // routine later
    { done: false, recurring: false, due: "2026-10-23" },                   // deadline today
    { done: false, recurring: false, due: "2026-10-01" },                   // overdue deadline
    { done: true,  recurring: false, scheduled: "2026-10-23" },             // done
    { done: false, recurring: false },                                      // no date
  ];
  assert.equal(todayCount(tasks, d), 4);
});

test("levelInfo", () => {
  assert.deepEqual(levelInfo(0),   { level: 1, progress: 0,  cost: 100 });
  assert.deepEqual(levelInfo(99),  { level: 1, progress: 99, cost: 100 });
  assert.deepEqual(levelInfo(100), { level: 2, progress: 0,  cost: 125 });
  assert.deepEqual(levelInfo(260), { level: 3, progress: 35, cost: 150 });
});

test("projectRepeats", () => {
  const p = (rule, from, until) => projectRepeats(rule, from, until);
  assert.deepEqual(p("every day when done", "2026-10-26", "2026-10-29"), ["2026-10-27", "2026-10-28", "2026-10-29"]);
  assert.deepEqual(p("every 3 days when done", "2026-10-26", "2026-11-04"), ["2026-10-29", "2026-11-01", "2026-11-04"]);
  // 2026-10-27 is a Tuesday
  assert.deepEqual(p("every week on Tuesday, Thursday", "2026-10-27", "2026-11-05"), ["2026-10-29", "2026-11-03", "2026-11-05"]);
  assert.deepEqual(p("every week", "2026-10-27", "2026-11-10"), ["2026-11-03", "2026-11-10"]);
  assert.deepEqual(p("every month on the 1st", "2026-11-01", "2027-01-15"), ["2026-12-01", "2027-01-01"]);
  assert.deepEqual(p("every 2 months when done", "2026-08-31", "2027-01-01"), ["2026-10-31", "2026-12-31"]);
  assert.deepEqual(p("every month", "2026-01-31", "2026-03-31"), ["2026-02-28", "2026-03-31"]);   // clamps, keeps the 31st
  assert.deepEqual(p("every year", "2026-02-14", "2028-12-31"), ["2027-02-14", "2028-02-14"]);
  assert.deepEqual(p("every fortnight-ish", "2026-10-26", "2026-12-31"), []);   // unknown rule: nothing
});

test("monthGrid", () => {
  const g = monthGrid("2026-10-15");   // Oct 2026 starts on Thursday
  assert.equal(g[0], "2026-09-28"); assert.equal(g.length % 7, 0); assert.equal(g.at(-1), "2026-11-01");
});

test("ruleText", () => {
  assert.equal(ruleText("every 3 days when done"), "every 3 days after done");
  assert.equal(ruleText("every day when done "), "daily after done");
  assert.equal(ruleText("every 2 months when done"), "every 2 months after done");
  assert.equal(ruleText("every week on Monday, Wednesday, Friday when done"), "Mon · Wed · Fri after done");
  assert.equal(ruleText("every week on Tuesday, Thursday"), "Tue · Thu");
  assert.equal(ruleText("every month on the 1st"), "monthly, the 1st");
  assert.equal(ruleText("every year"), "yearly");
  assert.equal(ruleText("every weekday"), "every weekday");   // unknown: as written
});

