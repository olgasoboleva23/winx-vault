import { test } from "node:test";
import assert from "node:assert/strict";
import { weekOf } from "../src/core/dates.js";
import { Goal, reminders } from "../src/widgets/goals/goal.js";
import { CycleLog } from "../src/widgets/body/cycleLog.js";
import { WeightLog } from "../src/widgets/body/weightLog.js";
import { MarketItem } from "../src/widgets/market/marketItem.js";

// 2026-10-19 is a Monday
const w = Goal.parse("name:: Stretching\n  tag:: #goal/stretch\n  days:: пн, ср, пт\n  min:: 10 minutes\n  plan:: if...");
const l = Goal.parse("name:: Reading\n  tag:: #goal/read\n  perWeek:: 5");

test("Goal.parse and its weekly target", () => {
  assert.deepEqual([w.name, w.tag, w.days, w.perWeek], ["Stretching", "#goal/stretch", [1, 3, 5], null]);
  assert.equal(l.weeklyTarget, 5); assert.equal(w.weeklyTarget, 3);
  assert.equal(Goal.parse("name:: X\n days:: пн\n perWeek:: 4\n tag:: #goal/x").perWeek, null);
  assert.equal(Goal.parse("name:: no tag"), null);
  assert.deepEqual(Goal.parse("name:: X\n tag:: #goal/x\n days:: Mon, wed, Friday").days, [1, 3, 5]);
});

test("Goal: days done in a week, and a day's status", () => {
  assert.equal(w.doneIn(["2026-10-19", "2026-10-19", "2026-10-21", "2026-10-12"], weekOf("2026-10-22")), 2);
  assert.equal(w.statusOn("2026-10-21", new Set(), "2026-10-22"), "missed");
  assert.equal(w.statusOn("2026-10-23", new Set(), "2026-10-22"), "planned");
  assert.equal(w.statusOn("2026-10-20", new Set(), "2026-10-22"), "none");
  assert.equal(l.statusOn("2026-10-20", new Set(["2026-10-20"]), "2026-10-22"), "done");
});

test("reminders", () => {
  const goals = [
    Goal.parse("name:: Stretching\n tag:: #goal/stretch\n days:: пн, ср, пт\n plan:: after lunch → yoga mat"),
    Goal.parse("name:: Reading\n tag:: #goal/read\n perWeek:: 5\n min:: one chapter\n remind:: 20:30"),
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
  assert.deepEqual(reminders(tasks, goals), [
    { at: "00:00", title: "In 30 minutes", body: "call 0:15 at night" },
    { at: "09:30", title: "In 30 minutes", body: "meeting 10:00" },
    { at: "18:00", title: "Stretching", body: "after lunch → yoga mat" },
    { at: "20:30", title: "Reading", body: "one chapter" },
  ]);
});

test("CycleLog: the day of the cycle on a date", () => {
  assert.equal(new CycleLog(["2026-10-05"]).on("2026-10-01"), null);
  assert.deepEqual(new CycleLog(["2026-10-05"]).on("2026-10-22"), { day: 18, length: 30, nextStart: "2026-11-04", daysUntil: 13, isPeriod: false, ended: false });
  const c = new CycleLog(["2026-08-01", "2026-08-29", "2026-09-28", "2026-10-27"]).on("2026-10-30");
  assert.equal(c.length, 29); assert.equal(c.day, 4); assert.equal(c.isPeriod, true);
});

test("CycleLog with end dates", () => {
  const s = ["2026-09-12", "2026-10-11"];
  const one = ends => new CycleLog(["2026-10-11"], ends, 8);
  // no end yet for the current cycle: falls back to period length
  assert.equal(one([]).on("2026-10-15").isPeriod, true);
  assert.equal(one([]).on("2026-10-15").ended, false);
  // end recorded: period lasts exactly to it
  assert.equal(one(["2026-10-16"]).on("2026-10-16").isPeriod, true);
  assert.equal(one(["2026-10-16"]).on("2026-10-16").ended, true);
  assert.equal(one(["2026-10-16"]).on("2026-10-17").isPeriod, false);
  // past days of a week view see the end even if it is after them
  assert.equal(one(["2026-10-16"]).on("2026-10-13").ended, false);
  assert.equal(one(["2026-10-16"]).on("2026-10-13").isPeriod, true);
  // previous cycle's end does not end the current one
  const c = new CycleLog(s, ["2026-09-17"], 8).on("2026-10-12");
  assert.deepEqual([c.isPeriod, c.ended], [true, false]);
  // recorded lengths replace the default: last time 6 days, so day 7 is not period
  assert.equal(new CycleLog(s, ["2026-09-17"], 8).on("2026-10-17").isPeriod, false);
  assert.equal(new CycleLog(s, ["2026-09-17"], 8).on("2026-10-16").isPeriod, true);
});

test("WeightLog: entries by date, the last one, a day set", () => {
  const log = new WeightLog("%% note %%\n- 2026-10-21 70.1\n- 2026-10-08 70,8\nnot a line\n- 2026-10-23 70.5\n");
  assert.deepEqual(log.entries, [{ date: "2026-10-08", kg: 70.8 }, { date: "2026-10-21", kg: 70.1 }, { date: "2026-10-23", kg: 70.5 }]);
  assert.deepEqual(log.last, { date: "2026-10-23", kg: 70.5 });
  assert.equal(new WeightLog("").last, null);
  // new day appends, same day replaces, other text untouched
  assert.equal(new WeightLog("- 2026-10-21 70.1").set("2026-10-23", 70.5), "- 2026-10-21 70.1\n- 2026-10-23 70.5\n");
  assert.equal(new WeightLog("%% x %%\n- 2026-10-23 70.5\n").set("2026-10-23", 71), "%% x %%\n- 2026-10-23 71\n");
  assert.equal(new WeightLog("").set("2026-10-23", 70.5), "- 2026-10-23 70.5\n");
});

test("MarketItem: bought / unbought, the way the Tasks plugin marks a line", () => {
  assert.equal(new MarketItem("- [ ] apples #food").bought("2026-10-23"), "- [x] apples #food ✅ 2026-10-23");
  assert.equal(new MarketItem("  - [ ] rice #food  ").bought("2026-10-23"), "  - [x] rice #food ✅ 2026-10-23");
  assert.equal(new MarketItem("- [x] apples #food ✅ 2026-10-01").bought("2026-10-23"), "- [x] apples #food ✅ 2026-10-01");   // already bought
  assert.equal(new MarketItem("просто текст").bought("2026-10-23"), "просто текст");
  assert.equal(new MarketItem("- [x] apples #food ✅ 2026-10-23").unbought(), "- [ ] apples #food");
  assert.equal(new MarketItem("  - [x] rice #food ✅ 2026-10-23 ").unbought(), "  - [ ] rice #food");
  assert.equal(new MarketItem("- [ ] уже открыт #pet").unbought(), "- [ ] уже открыт #pet");
  assert.equal(new MarketItem(new MarketItem("- [ ] хлеб #food").bought("2026-10-23")).unbought(), "- [ ] хлеб #food");
});

test("MarketItem: its name, its category tag, bought or not", () => {
  const i = new MarketItem("- [x] green tea #food #brand/x 📅 2026-10-01 ✅ 2026-10-02");
  assert.equal(i.name, "green tea");
  assert.equal(i.tag, "#food");
  assert.equal(i.isBought, true);
  assert.equal(new MarketItem("- [ ] soap").tag, "#other");
  assert.equal(new MarketItem("- [ ] soap").isBought, false);
});
