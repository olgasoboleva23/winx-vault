import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { setApp } from "../src/core/app.js";

let mount, SavingsJars, savingsActions, Form;
before(async () => {
  GlobalRegistrator.register();
  globalThis.window.moment = () => ({ format: () => "2026-10-30" });
  ({ mount } = await import("@vue/test-utils"));
  SavingsJars = (await import("../src/widgets/savings/SavingsJars.vue")).default;
  ({ savingsActions } = await import("../src/widgets/savings/savings.js"));
  ({ Form } = await import("../src/uikit/form.ts"));
});
const jar = {
  path: "S/Bike.md", name: "New bike", img: "app://bike.webp", greyed: "clip-path: inset(0 0 25% 0)",
  big: "10 000 ₽", note: "25% of 40 000 ₽", fill: 25, stamps: [true, true, false], next: "Mon 16.11 · Mon 30.11",
  due: { when: "payday today", sum: "5 000 ₽" },
};

test("Savings: a jar's picture, sums, bar and stamps; ✓ done puts that jar's deposit in", async () => {
  const paths = [];
  const w = mount(SavingsJars, { props: { state: { data: { jars: [jar], empty: "" } }, actions: { deposit: p => paths.push(p) } } });
  assert.equal(w.find(".winx-jar__name").text(), "✦ New bike");
  assert.equal(w.findAll(".winx-jar__img").length, 2);
  assert.equal(w.findAll(".winx-jar__stamp--on").length, 2);
  assert.equal(w.find(".winx-jar__due-sum").text(), "put in 5 000 ₽");
  await w.find(".winx-jar__due button").trigger("click");
  assert.deepEqual(paths, ["S/Bike.md"]);
  const none = mount(SavingsJars, { props: { state: { data: { jars: [], empty: "A goal: a note in S" } }, actions: {} } });
  assert.equal(none.text(), "✦ A goal: a note in S");
});

test("deposit: per_payday as it is; without it the sum asked for; nothing when the window is closed", async () => {
  const files = { "S/Bike.md": "- 2026-10-16 5000\n", "S/Free.md": "" };
  const props = { "S/Bike.md": { per_payday: 5000 }, "S/Free.md": {} };
  const app = {
    vault: { getFileByPath: p => ({ path: p }), process: async (f, fn) => { files[f.path] = fn(files[f.path]); } },
    metadataCache: { getCache: p => ({ frontmatter: props[p] }) },
  };
  setApp(app);
  const { deposit } = savingsActions({ app });
  await deposit("S/Bike.md");
  assert.match(files["S/Bike.md"], /- 2026-10-30 5000\n$/);
  Form.ask = async () => ({ sum: 700 });
  await deposit("S/Free.md");
  assert.equal(files["S/Free.md"], "\n- 2026-10-30 700\n");
  Form.ask = async () => null;
  await deposit("S/Free.md");
  assert.equal(files["S/Free.md"], "\n- 2026-10-30 700\n");
});
