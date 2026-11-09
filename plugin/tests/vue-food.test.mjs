import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { FOOD_LOG, FOODS, JOURNALS } from "#/helpers/paths.js";

let mount, FoodPage, loadFood, DEFAULT_MARKS;
before(async () => {
  GlobalRegistrator.register();
  window.moment = () => ({ format: () => "2026-11-04" });   // a Wednesday
  ({ mount } = await import("@vue/test-utils"));
  FoodPage = (await import("#/components/pages/food/index.vue")).default;
  ({ loadFood } = await import("#/controllers/food.js"));
  ({ DEFAULT_MARKS } = await import("#/models/food.js"));
});
const tick = () => new Promise(r => setTimeout(r));
const LOG = "- 2026-11-02 f1\n- 2026-11-02 f2\n- 2026-11-02 note: сыпь\n";
const data = () => ({
  today: "2026-11-04", marks: DEFAULT_MARKS, log: LOG,
  foods: [{ id: "f1", name: "каша с 4 ч", marks: ["m1"] }, { id: "f2", name: "кофе с бзм", marks: ["m3"] }],
  journals: [{ path: `${JOURNALS}/Высыпания.md`, name: "Высыпания", lag: 1, entries: new Map([["2026-11-03", { level: 2, reasons: ["🍰"] }]]) }],
  courses: [{ path: "M/Курс.md", name: "Курс", start: "2026-11-02", days: 2, meds: [{ code: "МА", name: "мастодинон", days: 2 }], taken: new Map([["2026-11-03", new Set(["МА"])]]) }],
});

test("the food page: the week, a row a day: what was eaten with its marks, the marks counted, the journal the next day, the course, the note", () => {
  const w = mount(FoodPage, { props: { state: { data: data() } } });
  const rows = w.findAll(".winx-table__row");

  assert.equal(rows.length, 7);
  assert.match(w.find(".winx-food__week").text(), /2 ноя – 8 ноя/);
  const mon = rows[0];

  assert.deepEqual(mon.findAll(".winx-food__item-name").map(i => i.text()), ["каша с 4 ч 🍫", "кофе с бзм 🥛↓"]);
  assert.deepEqual(mon.findAll(".winx-food__count").map(c => c.text()), ["1", "", "1"]);
  assert.equal(mon.find(".winx-food__level").text(), "2");   // Высыпания on the 3rd
  assert.ok(w.findAll(".winx-table__head").map(h => h.text()).includes("Высыпания +1д"));   // the next day's, said in its head
  assert.equal(mon.find(".winx-food__course").text(), "💊");
  assert.equal(mon.find(".winx-food__med").text(), "МА");
  assert.equal(mon.find(".winx-food__med").attributes("aria-label"), "мастодинон: не принято");
  assert.ok(mon.find(".winx-food__med").classes().includes("winx-food__med--not"));   // no ✅ that day
  assert.ok(!rows[1].find(".winx-food__med").classes().includes("winx-food__med--not"));
  assert.equal(rows[2].find(".winx-food__course").exists(), false);   // the course is over
  assert.equal(mon.find(".winx-food__note input").element.value, "сыпь");
  assert.ok(rows[2].classes().includes("winx-food__row--today"));
});

test("the food page: ‹ › step a week; × takes an eaten one off; a note typed is written", async () => {
  const { files } = vault({ [FOOD_LOG]: LOG });
  const w = mount(FoodPage, { props: { state: { data: data() } } });

  await w.find(".winx-food__prev").trigger("click");
  assert.match(w.find(".winx-food__week").text(), /26 окт – 1 ноя/);
  await w.find(".winx-food__next").trigger("click");
  await w.findAll(".winx-table__row")[0].findAll(".winx-food__off")[1].trigger("click"); await tick();
  assert.equal(files[FOOD_LOG], "- 2026-11-02 f1\n- 2026-11-02 note: сыпь\n");
  const input = w.findAll(".winx-table__row")[1].find(".winx-food__note input");

  input.element.value = "ок";
  await input.trigger("change"); await tick();
  assert.match(files[FOOD_LOG], /- 2026-11-03 note: ок\n$/);
});

test("loadFood: the foods and marks, the log, the journals, the medication courses", async () => {
  vault({
    [FOODS]: "---\nmarks: []\n---\n- f1 чай\n", [FOOD_LOG]: LOG, [`${JOURNALS}/Высыпания.md`]: "- 2026-11-03 1\n",
    "M/Курс.md": "```winx\nmeds\n| Дата | МА☀️ | МА🌙 | Заметки |\n| --- | :-: | :-: | --- |\n| 2026-11-02 | ☐ | ✅ |  |\n| 2026-11-03 | ☐ | ❌ |  |\n```\n",
  }, { props: { [FOODS]: { marks: [{ tag: "m1", icon: "🍫", name: "какао" }] }, [`${JOURNALS}/Высыпания.md`]: { lag: 1 }, "M/Курс.md": { type: "meds", start: "2026-11-02", days: 5, meds: [{ name: "мастодинон 30 капель", code: "МА", days: 5 }] } } });
  const d = await loadFood();

  assert.deepEqual(d.foods, [{ id: "f1", name: "чай", marks: [] }]);
  assert.deepEqual(d.marks.map(m => m.icon), ["🍫"]);
  assert.equal(d.log, LOG);
  assert.deepEqual([d.journals[0].name, d.journals[0].lag], ["Высыпания", 1]);
  assert.deepEqual(d.courses.map(({ taken, ...c }) => c), [{ path: "M/Курс.md", name: "Курс", start: "2026-11-02", days: 5, meds: [{ code: "МА", name: "мастодинон", days: 5 }] }]);
  assert.deepEqual([...d.courses[0].taken], [["2026-11-02", new Set(["МА"])], ["2026-11-03", new Set()]]);   // a ✅ that day (❌ isn't one)
});
