import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, GoalsWidget;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  GoalsWidget = (await import("../src/widgets/goals/GoalsWidget.vue")).default;
});

test("Goals: a goal's count, its dots (the page's day ringed), its plan as the tooltip and its minimum line", () => {
  const dots = [{ day: "2026-11-02", status: "done", sel: false }, { day: "2026-11-03", status: "missed", sel: true }];
  const data = { goals: [{ name: "Stretch", plan: "5 min", count: "1 of 3", dots, min: "min: 1 pose" }] };
  const el = mount(GoalsWidget, { props: { state: { data } } }).element;
  assert.equal(el.querySelector(".winx-goal").title, "5 min");
  assert.equal(el.querySelector(".winx-goal__count").textContent, "1 of 3 this week");
  assert.deepEqual([...el.querySelectorAll(".winx-goal__dot")].map(d => d.className),
    ["winx-goal__dot winx-goal__dot--done", "winx-goal__dot winx-goal__dot--missed winx-goal__dot--sel"]);
  assert.equal(el.querySelector(".winx-goal__min").textContent, "min: 1 pose");
});

test("Goals: no Goals note → the line to create it", () => {
  const el = mount(GoalsWidget, { props: { state: { data: { missing: true, path: "x/Goals.md" } } } }).element;
  assert.equal(el.textContent, "✦ Create x/Goals.md");
});
