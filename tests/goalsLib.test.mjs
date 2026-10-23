import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const L = eval(readFileSync(new URL("../00 System/Scripts/dvWidgets/goalsLib.js", import.meta.url), "utf8"));

// 2026-10-19 is a Monday
test("weeks", () => {
  assert.deepEqual(L.weekOf("2026-10-22"), ["2026-10-19","2026-10-20","2026-10-21","2026-10-22","2026-10-23","2026-10-24","2026-10-25"]);
  assert.deepEqual(L.weekOf("2026-10-25")[0], "2026-10-19");
});

const w = L.parseGoal("name:: Stretching\n  tag:: #goal/stretch\n  days:: пн, ср, пт\n  min:: 10 minutes\n  plan:: if...");
const l = L.parseGoal("name:: Reading\n  tag:: #goal/read\n  perWeek:: 5");

test("parseGoal and weeklyTarget", () => {
  assert.deepEqual([w.name, w.tag, w.days, w.perWeek], ["Stretching", "#goal/stretch", [1,3,5], null]);
  assert.equal(L.weeklyTarget(l), 5); assert.equal(L.weeklyTarget(w), 3);
  assert.equal(L.parseGoal("name:: X\n days:: пн\n perWeek:: 4\n tag:: #goal/x").perWeek, null);
  assert.equal(L.parseGoal("name:: no tag"), null);
});

test("countDone and dayStatus", () => {
  assert.equal(L.countDone(["2026-10-19","2026-10-19","2026-10-21","2026-10-12"], L.weekOf("2026-10-22")), 2);
  assert.equal(L.dayStatus(w, "2026-10-21", new Set(), "2026-10-22"), "missed");
  assert.equal(L.dayStatus(w, "2026-10-23", new Set(), "2026-10-22"), "planned");
  assert.equal(L.dayStatus(w, "2026-10-20", new Set(), "2026-10-22"), "none");
  assert.equal(L.dayStatus(l, "2026-10-20", new Set(["2026-10-20"]), "2026-10-22"), "done");
});

test("nextPlannedDate", () => {
  assert.equal(L.nextPlannedDate(w, "2026-10-22"), "2026-10-23");
  assert.equal(L.nextPlannedDate(w, "2026-10-23"), "2026-10-23");
  assert.equal(L.nextPlannedDate(w, "2026-11-28"), "2026-11-30");   // weeks late, one jump
  assert.equal(L.nextPlannedDate(l, "2026-10-22"), "2026-10-22");
});

test("cycleInfo", () => {
  assert.equal(L.cycleInfo(["2026-10-05"], "2026-10-01"), null);
  assert.deepEqual(L.cycleInfo(["2026-10-05"], "2026-10-22"), {day: 18, length: 30, nextStart: "2026-11-04", daysUntil: 13, isPeriod: false, ended: false});
  const c = L.cycleInfo(["2026-08-01","2026-08-29","2026-09-28","2026-10-27"], "2026-10-30");
  assert.equal(c.length, 29); assert.equal(c.day, 4); assert.equal(c.isPeriod, true);
});

test("rollDue", () => {
  assert.equal(L.rollDue("- [ ] #goal/x a 🔁 every day 📅 2026-10-01", "2026-10-01", "2026-10-22"), "- [ ] #goal/x a 🔁 every day 📅 2026-10-22");
  assert.equal(L.rollDue("- [ ] #goal/x a 📅 2026-10-05", "2026-10-01", "2026-10-22"), "- [ ] #goal/x a 📅 2026-10-05");
});

test("cycleInfo with end dates", () => {
  const s = ["2026-09-12", "2026-10-11"];
  // no end yet for the current cycle: falls back to period length
  assert.equal(L.cycleInfo(["2026-10-11"], "2026-10-15", 8).isPeriod, true);
  assert.equal(L.cycleInfo(["2026-10-11"], "2026-10-15", 8).ended, false);
  // end recorded: period lasts exactly to it
  assert.equal(L.cycleInfo(["2026-10-11"], "2026-10-16", 8, ["2026-10-16"]).isPeriod, true);
  assert.equal(L.cycleInfo(["2026-10-11"], "2026-10-16", 8, ["2026-10-16"]).ended, true);
  assert.equal(L.cycleInfo(["2026-10-11"], "2026-10-17", 8, ["2026-10-16"]).isPeriod, false);
  // past days of a week view see the end even if it is after them
  assert.equal(L.cycleInfo(["2026-10-11"], "2026-10-13", 8, ["2026-10-16"]).ended, false);
  assert.equal(L.cycleInfo(["2026-10-11"], "2026-10-13", 8, ["2026-10-16"]).isPeriod, true);
  // previous cycle's end does not end the current one
  const c = L.cycleInfo(s, "2026-10-12", 8, ["2026-09-17"]);
  assert.deepEqual([c.isPeriod, c.ended], [true, false]);
  // recorded lengths replace the default: last time 6 days, so day 7 is not period
  assert.equal(L.cycleInfo(s, "2026-10-17", 8, ["2026-09-17"]).isPeriod, false);
  assert.equal(L.cycleInfo(s, "2026-10-16", 8, ["2026-09-17"]).isPeriod, true);
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
  const s = L.supplyStats(h, "2026-09-30");
  assert.deepEqual(s.map(x => x.name), ["apples", "rice"]);          // bought once: not a staple
  const hay = s[0];
  assert.deepEqual([hay.buys, hay.avg, hay.since, hay.due, hay.tag], [3, 10, 9, true]  .concat(["#pet"]));
  const salt = s[1];
  assert.deepEqual([salt.buys, salt.avg, salt.tag], [2, null, "#home"]); // <3 buys: no forecast; last tag wins
  assert.equal(salt.due, false);
  assert.equal(L.supplyStats(h, "2026-09-25")[0].due, false);        // 4 of 10 days
});

test("reminders", () => {
  const goals = [
    L.parseGoal("name:: Stretching\n tag:: #goal/stretch\n days:: пн, ср, пт\n plan:: after lunch → yoga mat"),
    L.parseGoal("name:: Reading\n tag:: #goal/read\n perWeek:: 5\n min:: one chapter\n remind:: 20:30"),
  ];
  assert.equal(goals[0].remind, "18:00");                 // default
  assert.equal(goals[1].remind, "20:30");
  const tasks = [
    { text: "stretch #goal/stretch", tags: ["#goal/stretch"] },
    { text: "read #goal/read", tags: ["#goal/read"] },
    { text: "#⭐easy meeting 10:00", tags: ["#⭐easy"] },
    { text: "call 0:15 at night", tags: [] },
    { text: "buy apples", tags: [] },
  ];
  assert.deepEqual(L.reminders(tasks, goals), [
    { at: "00:00", title: "Через 30 минут", body: "call 0:15 at night" },
    { at: "09:30", title: "Через 30 минут", body: "meeting 10:00" },
    { at: "18:00", title: "Stretching", body: "after lunch → yoga mat" },
    { at: "20:30", title: "Reading", body: "one chapter" },
  ]);
});

test("markBought", () => {
  assert.equal(L.markBought("- [ ] apples #food", "2026-10-23"), "- [x] apples #food ✅ 2026-10-23");
  assert.equal(L.markBought("  - [ ] rice #food  ", "2026-10-23"), "  - [x] rice #food ✅ 2026-10-23");
  assert.equal(L.markBought("- [x] apples #food ✅ 2026-10-01", "2026-10-23"), "- [x] apples #food ✅ 2026-10-01"); // already bought: unchanged
  assert.equal(L.markBought("просто текст", "2026-10-23"), "просто текст");
});
