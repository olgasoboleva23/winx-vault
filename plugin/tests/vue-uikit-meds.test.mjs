import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";

let mount, flushPromises, WinxTabs, WinxMarkdown;
before(async () => {
  GlobalRegistrator.register();
  ({ mount, flushPromises } = await import("@vue/test-utils"));
  WinxTabs = (await import("../src/components/uikit/WinxTabs/index.vue")).default;
  WinxMarkdown = (await import("../src/components/uikit/WinxMarkdown.vue")).default;
});

test("WinxTabs: scroll keeps the tabs in one row", () => {
  const tabs = [{ key: "a", text: "A" }];

  assert.ok(mount(WinxTabs, { props: { tabs, scroll: true } }).classes("winx-tabs--scroll"));
  assert.ok(!mount(WinxTabs, { props: { tabs } }).classes("winx-tabs--scroll"));
});

test("WinxMarkdown: renders the text, again when it changes", async () => {
  const md = mount(WinxMarkdown, { props: { text: "**a**" } });
  await flushPromises();
  assert.equal(md.find(".winx-markdown").text(), "**a**");

  await md.setProps({ text: "b" });
  await flushPromises();
  assert.equal(md.find(".winx-markdown").text(), "b");
});
