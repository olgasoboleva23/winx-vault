import { test, before } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { COURSES, FOOD_DATA, FOOD_LOG, JOURNALS, MEDICATION } from "#/helpers/paths.js";
import { forFood } from "#/models/course.js";

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
const LOG = { "2026-11-02": { eaten: ["f1", "f2"], note: "сыпь" } };
// a course as courses.json keeps it (made-up)
const REC = {
  start: "2026-11-02", meds: [{ name: "мастодинон", code: "МА", times: "both", days: 2 }],
  notes: "", marks: { "2026-11-03": { "МА🌙": "✅" } }, dayNotes: {},
};
const data = () => ({
  today: "2026-11-04", marks: DEFAULT_MARKS, log: LOG,
  foods: [{ id: "f1", name: "каша с 4 ч", marks: ["m1"] }, { id: "f2", name: "кофе с бзм", marks: ["m3"] }],
  journals: [{ path: `${JOURNALS}/Высыпания.md`, name: "Высыпания", lag: 1, entries: new Map([["2026-11-03", { level: 2, reasons: ["🍰"] }]]) }],
  courses: [forFood("c1", REC)],
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
  let opened = null;

  vault().app.workspace.openLinkText = p => { opened = p; };
  mon.find(".winx-food__course").trigger("click");
  assert.equal(opened, MEDICATION);
  assert.equal(mon.find(".winx-food__med").text(), "МА");
  assert.equal(mon.find(".winx-food__med").attributes("aria-label"), "мастодинон: не принято");
  assert.ok(mon.find(".winx-food__med").classes().includes("winx-food__med--not"));   // no ✅ that day
  assert.ok(!rows[1].find(".winx-food__med").classes().includes("winx-food__med--not"));
  assert.equal(rows[2].find(".winx-food__course").exists(), false);   // the course is over
  assert.equal(mon.find(".winx-food__note input").element.value, "сыпь");
  assert.ok(rows[2].classes().includes("winx-food__row--today"));
});

test("the food page: ‹ › step a week; × takes an eaten one off; a note typed is written", async () => {
  const { files } = vault({ [FOOD_LOG]: JSON.stringify(LOG) });
  const day = date => JSON.parse(files[FOOD_LOG])[date];
  const w = mount(FoodPage, { props: { state: { data: data() } } });

  await w.find(".winx-food__prev").trigger("click");
  assert.match(w.find(".winx-food__week").text(), /26 окт – 1 ноя/);
  await w.find(".winx-food__next").trigger("click");
  await w.findAll(".winx-table__row")[0].findAll(".winx-food__off")[1].trigger("click"); await tick();
  assert.deepEqual(day("2026-11-02"), { eaten: ["f1"], note: "сыпь" });
  const input = w.findAll(".winx-table__row")[1].find(".winx-food__note input");

  input.element.value = "ок";
  await input.trigger("change"); await tick();
  assert.deepEqual(day("2026-11-03"), { eaten: [], note: "ок" });
});

test("loadFood: the foods and marks, the log, the journals, the medication courses", async () => {
  vault({
    [FOOD_DATA]: JSON.stringify({ marks: [{ tag: "m1", icon: "🍫", name: "какао" }], foods: { f1: { name: "чай", marks: [] } } }),
    [FOOD_LOG]: JSON.stringify(LOG), [`${JOURNALS}/Высыпания.md`]: "- 2026-11-03 1\n",
    [COURSES]: JSON.stringify({ c1: { ...REC, marks: { "2026-11-02": { "МА🌙": "✅" }, "2026-11-03": { "МА🌙": "❌" } } } }),
  }, { props: { [`${JOURNALS}/Высыпания.md`]: { lag: 1 } } });
  const d = await loadFood();

  assert.deepEqual(d.foods, [{ id: "f1", name: "чай", marks: [] }]);
  assert.deepEqual(d.marks.map(m => m.icon), ["🍫"]);
  assert.deepEqual(d.log, LOG);
  assert.deepEqual([d.journals[0].name, d.journals[0].lag], ["Высыпания", 1]);
  assert.deepEqual(d.courses.map(({ taken, ...c }) => c), [{ id: "c1", name: "мастодинон", start: "2026-11-02", days: 2, meds: [{ code: "МА", name: "мастодинон", days: 2 }] }]);
  assert.deepEqual([...d.courses[0].taken], [["2026-11-02", new Set(["МА"])], ["2026-11-03", new Set()]]);   // a ✅ that day (❌ isn't one)
});

test("the food page: a training task adds a 🏋 column, ✓ on the days it was done", () => {
  const w = mount(FoodPage, { props: { state: { data: { ...data(), task: { id: "t5", name: "gym", days: new Set(["2026-11-02"]) } } } } });
  const rows = w.findAll(".winx-table__row");

  assert.ok(w.findAll(".winx-table__head").map(h => h.text()).includes("🏋"));
  assert.equal(rows[0].find(".winx-food__trained").text(), "✓");
  assert.equal(rows[1].find(".winx-food__trained").text(), "");
});

test("loadFood: no files yet: the default marks, nothing eaten, no task", async () => {
  vault();
  const d = await loadFood();

  assert.deepEqual([d.marks, d.foods, d.log, d.courses, d.task], [DEFAULT_MARKS, [], {}, [], null]);
});

test("setFoodNote, removeEaten: one day of log.json changed", async () => {
  const { files } = vault({ [FOOD_LOG]: JSON.stringify(LOG) });
  const { removeEaten, setFoodNote } = await import("#/controllers/food.js");

  await setFoodNote("2026-11-02", " пятна ");
  assert.equal(JSON.parse(files[FOOD_LOG])["2026-11-02"].note, "пятна");
  await removeEaten("2026-11-02", 1);
  assert.deepEqual(JSON.parse(files[FOOD_LOG])["2026-11-02"].eaten, ["f1"]);
});

test("editMarks: the marks written to food.json, the foods and the task kept, a new mark tagged next", async () => {
  const FOOD = { marks: [{ tag: "m2", icon: "🥛", name: "молоко" }], task: "t5", foods: { f1: { name: "чай", marks: ["m2"] } } };
  const { files } = vault({ [FOOD_DATA]: JSON.stringify(FOOD) });
  const { editMarks } = await import("#/controllers/food.js");
  const { Form } = await import("#/components/uikit/Form/index.ts");
  const ask = Form.ask;

  Form.ask = async (app, title, fields, { values }) => ({ marks: [...values.marks, { icon: "🍓", name: " ягоды " }] });
  try { await editMarks(); } finally { Form.ask = ask; }
  assert.deepEqual(JSON.parse(files[FOOD_DATA]), { ...FOOD, marks: [...FOOD.marks, { tag: "m3", icon: "🍓", name: "ягоды" }] });
});
