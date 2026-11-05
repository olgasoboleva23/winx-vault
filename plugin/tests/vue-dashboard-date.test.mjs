import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, DashboardDate;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  DashboardDate = (await import("../src/components/pages/dashboard/DashboardDate.vue")).default;
});

test("the date row: ‹ › step a day, today shows only on another day, an emptied field means today", async () => {
  const w = mount(DashboardDate, { props: { date: "2026-11-03", today: "2026-11-05" } });
  assert.equal(w.find("input").element.value, "2026-11-03");
  await w.find("button[title=next]").trigger("click");
  await w.find("button[title=previous]").trigger("click");
  await w.find("button[title=today]").trigger("click");
  assert.deepEqual(w.emitted("go"), [["2026-11-04"], ["2026-11-02"], [null]]);
  await w.setProps({ date: "2026-11-05" });
  assert.equal(w.find("input").element.value, "2026-11-05");
  assert.equal(w.find("button[title=today]").exists(), false);
  await w.find("input").setValue("");
  assert.deepEqual(w.emitted("go").at(-1), [null]);
});
