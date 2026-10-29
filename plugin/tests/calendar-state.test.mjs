import { test } from "node:test";
import assert from "node:assert/strict";
import { DEFAULT, readState, baseDate, shownDays } from "../src/calendar/state.js";

test("no or broken saved state gives the defaults", () => {
  assert.deepEqual(readState(undefined), DEFAULT);
  assert.deepEqual(readState({ view: "year", tab: "x", date: "soon", unfolded: "2026-10-28", showDone: "yes" }), DEFAULT);
  assert.deepEqual(DEFAULT, { date: null, view: "week", showDone: false, tab: "nodate", unfolded: [], backlogOpen: false, bdaysOpen: false });
});

test("a saved state comes back whole; unfolded days without repeats", () => {
  const s = readState({ date: "2026-10-05", view: "month", showDone: true, tab: "pool", unfolded: ["2026-10-28", "2026-10-28", 5], backlogOpen: true, bdaysOpen: true });
  assert.deepEqual(s, { date: "2026-10-05", view: "month", showDone: true, tab: "pool", unfolded: ["2026-10-28"], backlogOpen: true, bdaysOpen: true });
});

test("no date follows today", () => {
  assert.equal(baseDate(DEFAULT, "2026-10-28"), "2026-10-28");
  assert.deepEqual(shownDays(DEFAULT, "2026-10-28"), ["2026-10-26", "2026-10-27", "2026-10-28", "2026-10-29", "2026-10-30", "2026-10-31", "2026-11-01"]);
  assert.equal(shownDays(DEFAULT, "2026-11-02")[0], "2026-11-02");   // the next Monday: the next week
  assert.equal(baseDate({ ...DEFAULT, date: "2026-10-05" }, "2026-10-28"), "2026-10-05");
});

test("the month view shows whole weeks around the month", () => {
  const days = shownDays({ ...DEFAULT, view: "month", date: "2026-10-15" }, "2026-10-28");
  assert.equal(days[0], "2026-09-28");
  assert.equal(days.length % 7, 0);
  assert.ok(days.includes("2026-10-31"));
});
