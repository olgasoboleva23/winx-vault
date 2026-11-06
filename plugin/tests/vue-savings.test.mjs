import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";

let mount, SavingsJars, deposit, Form;
before(async () => {
  GlobalRegistrator.register();
  globalThis.window.moment = () => ({ format: () => "2026-10-30" });
  ({ mount } = await import("@vue/test-utils"));
  SavingsJars = (await import("#/components/pages/dashboard/widgets/savings/SavingsJars/index.vue")).default;
  ({ deposit } = await import("#/controllers/widgets/savings.js"));
  ({ Form } = await import("#/components/uikit/Form/index.ts"));
});
const jar = {
  path: "S/Bike.md", name: "New bike", img: "app://bike.webp", greyed: "clip-path: inset(0 0 25% 0)",
  big: "10 000 ₽", note: "25% of 40 000 ₽", fill: 25, stamps: [true, true, false], next: "Mon 16.11 · Mon 30.11",
  due: { when: "payday today", sum: "5 000 ₽" },
};
const tick = () => new Promise(r => setTimeout(r));

test("Savings: a jar's picture, sums, bar and stamps; ✓ done puts that jar's deposit in its note", async () => {
  const { files } = vault({ "S/Bike.md": "- 2026-10-16 5000\n" }, { props: { "S/Bike.md": { per_payday: 5000 } } });
  const w = mount(SavingsJars, { props: { state: { data: { jars: [jar], empty: "" } } } });
  assert.equal(w.find(".winx-jar__name").text(), "✦ New bike");
  assert.equal(w.findAll(".winx-jar__img").length, 2);
  assert.equal(w.findAll(".winx-jar__stamp--on").length, 2);
  assert.equal(w.find(".winx-jar__due-sum").text(), "put in 5 000 ₽");
  await w.find(".winx-jar__due button").trigger("click"); await tick();
  assert.equal(files["S/Bike.md"], "- 2026-10-16 5000\n- 2026-10-30 5000\n");
  const none = mount(SavingsJars, { props: { state: { data: { jars: [], empty: "A goal: a note in S" } } } });
  assert.equal(none.text(), "✦ A goal: a note in S");
});

test("deposit: per_payday as it is; without it the sum asked for; nothing when the window is closed", async () => {
  const { files } = vault({ "S/Bike.md": "- 2026-10-16 5000\n", "S/Free.md": "" }, { props: { "S/Bike.md": { per_payday: 5000 } } });
  await deposit("S/Bike.md");
  assert.match(files["S/Bike.md"], /- 2026-10-30 5000\n$/);
  Form.ask = async () => ({ sum: 700 });
  await deposit("S/Free.md");
  assert.equal(files["S/Free.md"], "\n- 2026-10-30 700\n");
  Form.ask = async () => null;
  await deposit("S/Free.md");
  assert.equal(files["S/Free.md"], "\n- 2026-10-30 700\n");
});
