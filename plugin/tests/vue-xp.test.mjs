import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, LevelToday, LifeAreas;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  LevelToday = (await import("#/components/pages/dashboard/widgets/xp/LevelToday/index.vue")).default;
  LifeAreas = (await import("#/components/pages/dashboard/widgets/xp/LifeAreas/index.vue")).default;
});

test("LevelToday: level, XP, progress and a bar per vital with its reasons as the tooltip", () => {
  const hp = { name: "HP", mod: "hp", value: 12, max: 50, width: 24, title: "missed tasks −40, done today +2" };
  const data = { total: 2310, level: 11, progress: 185, cost: 350, fill: "52.9", vitals: [hp] };
  const el = mount(LevelToday, { props: { state: { data } } }).element;
  assert.equal(el.querySelector(".winx-level__text").textContent, "Level: 11 | Total XP: 2310");
  assert.equal(el.querySelector(".winx-level__progress-fill").style.width, "52.9%");
  const vital = el.querySelector(".winx-level__vital--hp");
  assert.equal(vital.title, "missed tasks −40, done today +2");
  assert.equal(vital.querySelector(".winx-level__vital-value").textContent, "12/50");
});

test("LifeAreas: the chart's place, then the caption under it", () => {
  const w = mount({ components: { LifeAreas }, template: '<div><LifeAreas :state="s" /></div>',
    data: () => ({ s: { data: { scores: {}, chart: null } } }) });
  assert.equal(w.element.lastElementChild.textContent, "last 4 weeks");
});
