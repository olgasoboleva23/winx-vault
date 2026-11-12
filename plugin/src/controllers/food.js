// The food page's controller (components/pages/food): its data (the foods and their marks, the
// log, the free journals, the medication courses) and its writes: something eaten on a day (a
// fuzzy search of the foods, or a new one with its marks), a food edited, an eaten one taken off,
// a day's note, the marks edited.
import { prepareFuzzySearch } from "obsidian";
import { app } from "#/helpers/app.js";
import { readJson } from "#/helpers/files.js";
import { collection } from "#/helpers/collection.js";
import { todayYmd } from "#/helpers/dates.js";
import {
  foodList, marksOf, newFoodId, withEaten, withFood, withMarks, withNote, withoutEaten, withTask,
} from "#/models/food.js";
import { readJournals } from "#/controllers/journals.js";
import { forFood } from "#/models/course.js";
import { T } from "#/models/calendarData.js";
import { Notice } from "obsidian";
import { pickTask } from "#/components/uikit/TaskSearch/index.js";
import { taskStore } from "#/store/tasks.js";
import { Search } from "#/components/uikit/Search/index.ts";
import { Form } from "#/components/uikit/Form/index.ts";
import { COURSES, FOOD_DATA, FOOD_LOG } from "#/helpers/paths.js";

// food.json (the foods, the marks, the training task) and log.json (the days): each write one
// edit of its file
const food = collection(FOOD_DATA), log = collection(FOOD_LOG);
const readFood = () => readJson(FOOD_DATA, {});

// the medication courses (courses.json): when they run, their medicines, and by day the codes
// with a ✅
const courses = async () =>
  Object.entries(await readJson(COURSES, {})).map(([id, rec]) => forFood(id, rec));

export async function loadFood() {
  const [data, days, journals, taking] =
    await Promise.all([readFood(), readJson(FOOD_LOG, {}), readJournals(), courses()]);

  const id = data.task ?? null, rec = id && taskStore.records.get(id);
  const done = id ? taskStore.tasks.map(T).filter(t => t.id === id && t.isDone) : [];
  const task = id && { id, name: rec?.name ?? id, days: new Set(done.map(t => t.doneOn)) };

  return {
    task, today: todayYmd(), foods: foodList(data), marks: marksOf(data), log: days, journals,
    courses: taking,
  };
}

// a food's window: its name and a box per mark; null when closed
async function askFood(food, title) {
  const marks = marksOf(await readFood());
  const v = await Form.ask(app, title, [
    { name: "Name", key: "name", text: "каша с 4 ч" },
    ...marks.map(m => ({ name: `${m.icon} ${m.name}`, key: m.tag, check: "" })),
  ], {
    values: { name: food.name, ...Object.fromEntries(food.marks.map(t => [t, true])) },
    required: ["name"], submit: "Save",
  });

  return v && { ...food, name: v.name.trim(), marks: marks.filter(m => v[m.tag]).map(m => m.tag) };
}

// ＋ on a day: a food from the search (fuzzy), or a new one typed (its marks asked)
export async function addEaten(date) {
  const list = foodList(await readFood());
  const find = q => {
    const fuzzy = prepareFuzzySearch(q.trim()), named = list.some(f => f.name === q.trim());
    const found = q.trim() ? list.filter(f => fuzzy(f.name)) : list;

    return q.trim() && !named ? [...found, { name: q.trim(), isNew: true }] : found;
  };

  const pick = await Search.pick(app, "What was eaten…", find, (f, el) => {
    el.createSpan({ text: f.isNew ? `+ new: ${f.name}` : f.name });
  });

  if (!pick) return;
  let id = pick.id;

  if (pick.isNew) {
    const asked = await askFood({ name: pick.name, marks: [] }, `✦ ${pick.name}`);

    if (!asked) return;
    // the id taken inside the write, from the file as it is then
    await food.edit(d => {
      id = newFoodId(d);
      return withFood(d, { ...asked, id });
    });
  }

  await log.edit(l => withEaten(l, date, id));
}

// ✎ a food: its name and marks (the log keeps its id, so every day shows the change)
export async function editFood(id) {
  const found = foodList(await readFood()).find(f => f.id === id);
  const edited = found && await askFood(found, `✦ ${found.name}`);

  if (edited) await food.edit(d => withFood(d, edited));
}

export const removeEaten = (date, n) => log.edit(l => withoutEaten(l, date, n));

export const setFoodNote = (date, text) => log.edit(l => withNote(l, date, text));

// ⚙ the marks: an icon and a name each (+ adds one); a mark keeps its tag, a new one gets the next
export async function editMarks() {
  const marks = marksOf(await readFood());
  const v = await Form.ask(app, "✦ Marks", [{
    name: "Marks", key: "marks", required: ["icon", "name"],
    list: [{ name: "Icon", key: "icon", text: "🍫" }, { name: "Name", key: "name", text: "какао" }],
  }], { values: { marks: marks.map(m => ({ ...m })) }, required: ["marks"], submit: "Save" });

  if (!v) return;
  let n = Math.max(0, ...marks.map(m => Number(m.tag.slice(1)) || 0));
  const next = v.marks
    .map(m => ({ tag: m.tag ?? `m${++n}`, icon: m.icon.trim(), name: m.name.trim() }));

  await food.edit(d => withMarks(d, next));
}

// 🏋 the training task: a past one from the search (its id goes to food.json), not a new name
export async function pickTrainingTask() {
  const pick = await pickTask();

  if (!pick) return;
  if (pick.isNew) return void new Notice("✦ pick a task you already have");
  await food.edit(d => withTask(d, pick.id));
}
