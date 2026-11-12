import { test } from "node:test";
import assert from "node:assert/strict";
import { readState, saved, withParams, isStep } from "#/store/router.js";

test("readState: junk and old shapes become a whole state", () => {
  assert.equal(readState({ page: "nope", calendar: { view: "x" } }).page, "dashboard");
  assert.equal(readState(null).calendar.view, "week");
  assert.equal(readState({ dashboard: { date: 5 } }).dashboard.date, null);
  assert.equal(readState({ page: "calendar" }).page, "calendar");
  assert.equal(readState({ projects: { open: "p1" } }).projects.open, "p1");
});

test("saved: the calendar's area and picked day stay out", () => {
  const s = readState({ page: "calendar" });

  s.calendar.area = "body";
  s.calendar.picked = "2026-11-06";

  assert.equal("area" in saved(s).calendar, false);   // a contract: these are never saved
  assert.equal("picked" in saved(s).calendar, false);
  assert.equal(saved(s).page, "calendar");
});

test("withParams: a copy; changing it leaves the source alone", () => {
  const a = readState({ page: "calendar" });
  const b = withParams(a, "calendar", { view: "month" });

  assert.equal(b.calendar.view, "month");
  assert.equal(a.calendar.view, "week");
});

test("isStep: a page or an open project is a step; a calendar week is not", () => {
  const a = readState({ page: "calendar" });

  assert.equal(isStep(a, withParams(a, "dashboard")), true);
  assert.equal(isStep(a, withParams(a, "calendar", { date: "2026-12-01" })), false);
  assert.equal(isStep(a, withParams(a, "calendar", {})), false);
  assert.equal(isStep(a, withParams(a, "calendar")), false);
  assert.equal(isStep(a, withParams(a, "projects", { open: "p1" })), true);
});
