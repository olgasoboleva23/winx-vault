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

test("WinxMarkdown: a slow older draw never overwrites a newer one; owners are released", async () => {
  const { MarkdownRenderer } = await import("obsidian");
  const real = MarkdownRenderer.render, owners = [], gates = {};
  MarkdownRenderer.render = (app, md, el, path, owner) => {
    owners.push({ owner, path, loaded: () => owner._loaded });

    return new Promise(done => { gates[md] = () => { el.textContent = md; done(); }; });
  };
  try {
    const md = mount(WinxMarkdown, { props: { text: "old", sourcePath: "Note.md" } });
    await md.setProps({ text: "new" });
    gates.new();
    await flushPromises();
    gates.old();
    await flushPromises();

    assert.equal(md.find(".winx-markdown").text(), "new");
    assert.equal(owners[0].path, "Note.md");
    assert.equal(owners[0].loaded(), false);
    assert.equal(owners[1].loaded(), true);
    md.unmount();
    assert.equal(owners[1].loaded(), false);
  } finally { MarkdownRenderer.render = real; }
});

test("medication form: time checkboxes can be combined, cleared, saved and reopened", async () => {
  const { reactive } = await import("vue");
  const { courseForm, courseOf, formValues, columns } = await import("#/models/course.js");
  const Form = (await import("../src/components/uikit/Form/index.vue")).default;
  const values = reactive({ meds: [{ name: "Тест", days: 2 }] });
  const form = mount(Form, {
    props: { rows: courseForm().rows, values, ready: true, submit: "Save" },
    global: { provide: { resourcePath: () => "" } },
  });
  const checks = form.findAll('input[type="checkbox"]');

  assert.equal(checks.length, 3);
  await checks[0].setValue(true);
  await checks[1].setValue(true);
  const saved = courseOf(values, "2026-11-13");

  assert.deepEqual(columns(saved.meds).map(c => c.key), ["ТЕ☀️", "ТЕ🌤"]);
  const reopened = formValues(saved).meds[0];

  assert.deepEqual([reopened.morning, reopened.day, reopened.evening], [true, true, false]);
  await checks[0].setValue(false);
  await checks[1].setValue(false);
  assert.deepEqual(columns(courseOf(values, "2026-11-13").meds).map(c => c.key), ["ТЕ"]);
  form.unmount();
});
