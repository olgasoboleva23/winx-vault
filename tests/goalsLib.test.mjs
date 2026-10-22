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
  assert.deepEqual(L.cycleInfo(["2026-10-05"], "2026-10-22"), {day: 18, length: 30, nextStart: "2026-11-04", daysUntil: 13, isPeriod: false});
  const c = L.cycleInfo(["2026-08-01","2026-08-29","2026-09-28","2026-10-27"], "2026-10-30");
  assert.equal(c.length, 29); assert.equal(c.day, 4); assert.equal(c.isPeriod, true);
});
