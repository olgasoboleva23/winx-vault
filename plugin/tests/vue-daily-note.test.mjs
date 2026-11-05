import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, DailyNoteOpen;
before(async () => {
  GlobalRegistrator.register();
  ({ mount } = await import("@vue/test-utils"));
  DailyNoteOpen = (await import("#/components/pages/dashboard/widgets/DailyNoteOpen.vue")).default;
});

test("Daily note: ✦ Open for the page's date opens it; no date, no button", async () => {
  let opened = 0;
  const w = mount(DailyNoteOpen, { props: { state: { data: { date: "2026-11-04", text: "✦ Open" } }, actions: { open: () => opened++ } } });
  assert.equal(w.find("button").text(), "✦ Open");
  assert.equal(w.find("button").attributes("title"), "open the day's note");
  await w.find("button").trigger("click");
  assert.equal(opened, 1);
  const none = mount(DailyNoteOpen, { props: { state: { data: { date: undefined, text: "✦" } }, actions: {} } });
  assert.equal(none.find("button").exists(), false);
});
