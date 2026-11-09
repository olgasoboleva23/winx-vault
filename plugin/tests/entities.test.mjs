import { test } from "node:test";
import assert from "node:assert/strict";
import { weekOf } from "#/helpers/dates.js";
import { Goal, reminders } from "#/models/goal.js";
import { CycleLog } from "#/models/cycleLog.js";
import { WeightLog } from "#/models/weightLog.js";
import { BodyLog } from "#/models/bodyLog.js";
import { MarketItem } from "#/models/marketItem.js";
import { paydays, SavingsJar } from "#/models/savingsJar.js";

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
  // no end marked yet: still the period, however long (nothing is guessed)
  assert.deepEqual(new CycleLog(["2026-10-05"]).on("2026-10-22"), { day: 18, length: 30, period: 8, nextStart: "2026-11-04", daysUntil: 13, isPeriod: true, ended: false });
  const c = new CycleLog(["2026-08-01", "2026-08-29", "2026-09-28", "2026-10-27"]).on("2026-10-30");
  assert.equal(c.length, 29); assert.equal(c.day, 4); assert.equal(c.isPeriod, true);
});

test("CycleLog with end dates", () => {
  const s = ["2026-09-12", "2026-10-11"];
  const one = ends => new CycleLog(["2026-10-11"], ends, 8);
  // no end yet for the current cycle: the period goes on until one is marked
  assert.equal(one([]).on("2026-10-15").isPeriod, true);
  assert.equal(one([]).on("2026-10-30").isPeriod, true);
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
  // the usual length isn't used to end the current one: day 7 is still the period
  assert.equal(new CycleLog(s, ["2026-09-17"], 8).on("2026-10-17").isPeriod, true);
  // a past cycle with no end marked: its days aren't counted as the period (unknown, not guessed)
  assert.equal(new CycleLog(s, [], 8).on("2026-09-13").isPeriod, false);
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

test("MarketItem: its name, as the list shows it: no checkbox, tags or dates", () => {
  assert.equal(new MarketItem("- [ ] green tea #food ➕ 2026-10-01").name, "green tea");
  assert.equal(MarketItem.of({ status: " ", text: "  #pet/cat cat food #pet " }).name, "cat food");
  assert.equal(new MarketItem("- [x] green tea #food [completion:: 2026-11-09]").name, "green tea");
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

test("paydays: the 16th and the 30th (a short month's last day), a weekend one on the Friday before", () => {
  assert.deepEqual(paydays("2026-10-01", "2026-11-30"), ["2026-10-16", "2026-10-30", "2026-11-16", "2026-11-30"]);
  assert.deepEqual(paydays("2027-01-01", "2027-02-28"), ["2027-01-15", "2027-01-29", "2027-02-16", "2027-02-26"]);
  assert.deepEqual(paydays("2026-10-17", "2026-10-29"), []);
});

test("SavingsJar: saved, deposits, the payday's deposit until it's in, the halfway words", () => {
  const note = "---\nper_payday: 12000\n---\n- 2026-10-16 12000\n- 2026-10-31 20 000\nnot a deposit\n";
  const jar = new SavingsJar(note, { per_payday: 12000 });
  assert.equal(jar.saved, 32000);
  assert.equal(jar.deposits.length, 2);
  assert.equal(jar.pct, null);                                          // no price: no percent
  assert.equal(jar.due("2026-10-31"), null);                            // the 30th's deposit is in (on the 31st)
  assert.deepEqual(jar.due("2026-11-17"), { payday: "2026-11-16", sum: 12000 });
  assert.deepEqual(jar.next("2026-11-17", 2), ["2026-11-30", "2026-12-16"]);
  assert.equal(jar.deposit("2026-11-17").trim().split("\n").at(-1), "- 2026-11-17 12000");
  const free = new SavingsJar("- 2026-10-16 500\n");   // no per_payday: a deposit needs its sum
  assert.equal(free.deposit("2026-11-17"), "- 2026-10-16 500\n");
  assert.equal(free.deposit("2026-11-17", 700).trim().split("\n").at(-1), "- 2026-11-17 700");
  assert.equal(new SavingsJar("- 2026-10-16 2.5\n- 2026-10-31 1,5\n").saved, 4);   // a fraction counts
  assert.equal(new SavingsJar("- 2026-10-16 1\u00a0000\n").saved, 1000);             // a non-breaking space, as Intl writes it

  const priced = new SavingsJar(note, { per_payday: 12000, price: 60000 });
  assert.equal(priced.pct, 53);
  assert.equal(priced.left, 28000);
  assert.equal(new SavingsJar("- 2026-10-16 10000", { price: 60000 }).pct, 17);
});

test("CycleLog.endFor: 'ended yesterday' marks yesterday as the last day, not before the start", () => {
  const log = new CycleLog(["2026-09-12", "2026-10-11"]);
  assert.equal(log.endFor("2026-10-18"), "2026-10-17");
  assert.equal(log.endFor("2026-10-11"), "2026-10-11");   // ended on the day it started
});

test("CycleLog.last: the latest finished cycles, their length and period length", () => {
  const log = new CycleLog(["2026-07-01", "2026-07-29", "2026-08-27", "2026-09-27", "2026-10-27"], ["2026-07-06", "2026-08-03", "2026-09-04"]);
  assert.deepEqual(log.last(3), [
    { start: "2026-07-29", length: 29, period: 6 },
    { start: "2026-08-27", length: 31, period: 9 },
    { start: "2026-09-27", length: 30, period: null },   // no end recorded
  ]);
  assert.deepEqual(new CycleLog(["2026-10-27"]).last(4), []);   // the current one isn't finished
});

test("BodyLog: a level 0–3 and reasons per day; a day's entry replaced", () => {
  const log = new BodyLog("---\nname: Log\n---\n- 2026-10-30 2 rain, sleep\n- 2026-10-31 0\nnot an entry\n");
  assert.deepEqual(log.entries, [
    { date: "2026-10-30", level: 2, reasons: ["rain", "sleep"] },
    { date: "2026-10-31", level: 0, reasons: [] },
  ]);
  assert.equal(log.set("2026-10-31", 1, ["rain"]), "---\nname: Log\n---\n- 2026-10-30 2 rain, sleep\n- 2026-10-31 1 rain\nnot an entry\n");
  assert.equal(new BodyLog("").set("2026-11-01", 3, []), "- 2026-11-01 3\n");
});

test("CycleLog.recent: the current cycle so far, then the finished ones, newest first; ovulation 14 days before the end", () => {
  const log = new CycleLog(["2026-08-27", "2026-09-27", "2026-10-27"], ["2026-09-05", "2026-10-03"]);
  assert.deepEqual(log.recent(3, "2026-10-31"), [
    { start: "2026-10-27", end: "2026-10-31", days: 5, period: null, ovulation: null, current: true },
    { start: "2026-09-27", end: "2026-10-26", days: 30, period: 7, ovulation: 16, current: false },
    { start: "2026-08-27", end: "2026-09-26", days: 31, period: 10, ovulation: 17, current: false },
  ]);
});
