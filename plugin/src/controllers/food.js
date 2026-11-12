// The food page's controller (components/pages/food): its data (the foods and their marks, the
// log, the free journals, the medication courses) and its writes: something eaten on a day (a
// fuzzy search of the foods, or a new one with its marks), a food edited, an eaten one taken off,
// a day's note, the marks edited.
import { prepareFuzzySearch } from "obsidian";
import { app } from "#/helpers/app.js";
import { edit, readJson } from "#/helpers/files.js";
import { todayYmd } from "#/helpers/dates.js";
import { DEFAULT_MARKS, FoodLog, Foods } from "#/models/food.js";
import { readJournals } from "#/controllers/journals.js";
import { forFood } from "#/models/course.js";
import { T } from "#/models/calendarData.js";
import { Notice } from "obsidian";
import { pickTask } from "#/components/uikit/TaskSearch/index.js";
import { taskStore } from "#/store/tasks.js";
import { Search } from "#/components/uikit/Search/index.ts";
import { Form } from "#/components/uikit/Form/index.ts";
import { COURSES, FOOD_LOG, FOODS } from "#/helpers/paths.js";

const read = async path => {
  const file = app.vault.getFileByPath(path);

  return file ? app.vault.cachedRead(file) : "";
};

const marksOf = () => app.metadataCache.getCache(FOODS)?.frontmatter?.marks ?? DEFAULT_MARKS;
const taskIdOf = () => app.metadataCache.getCache(FOODS)?.frontmatter?.task ?? null;

// a note missing is made, empty
async function made(path, text) {
  if (app.vault.getFileByPath(path)) return;
  const dir = path.slice(0, path.lastIndexOf("/"));

  if (!app.vault.getFolderByPath(dir)) await app.vault.createFolder(dir);
  await app.vault.create(path, text);
}

// one property of Foods.md set (Obsidian writes the YAML, the others stay): `marks`, or `task`
// (the training task's id)
const setFoodsProp = (key, value) =>
  app.fileManager.processFrontMatter(app.vault.getFileByPath(FOODS), fm => { fm[key] = value; });

// the notes made when missing; Foods.md without `marks` shows the default ones
const ready = async () => {
  await made(FOODS, "");
  await made(FOOD_LOG, "");
};

// the medication courses (courses.json): when they run, their medicines, and by day the codes
// with a ✅
const courses = async () =>
  Object.entries(await readJson(COURSES, {})).map(([id, rec]) => forFood(id, rec));

export async function loadFood() {
  const [foods, log, journals, taking] =
    await Promise.all([read(FOODS), read(FOOD_LOG), readJournals(), courses()]);

  const id = taskIdOf(), rec = id && taskStore.records.get(id);
  const done = id ? taskStore.tasks.map(T).filter(t => t.id === id && t.isDone) : [];
  const task = id && { id, name: rec?.name ?? id, days: new Set(done.map(t => t.doneOn)) };

  return {
    task, today: todayYmd(), foods: new Foods(foods).list, marks: marksOf(), log, journals,
    courses: taking,
  };
}

// a food's window: its name and a box per mark; null when closed
async function askFood(food, title) {
  const marks = marksOf();
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
  await ready();
  const foods = new Foods(await read(FOODS)), list = foods.list;
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
    const food = await askFood({ id: foods.nextId, name: pick.name, marks: [] }, `✦ ${pick.name}`);

    if (!food) return;
    await edit(FOODS, t => new Foods(t).set(food));
    id = food.id;
  }

  await edit(FOOD_LOG, t => new FoodLog(t).add(date, id));
}

// ✎ a food: its name and marks (the log keeps its id, so every day shows the change)
export async function editFood(id) {
  const food = new Foods(await read(FOODS)).list.find(f => f.id === id);
  const edited = food && await askFood(food, `✦ ${food.name}`);

  if (edited) await edit(FOODS, t => new Foods(t).set(edited));
}

export const removeEaten = (date, n) => edit(FOOD_LOG, t => new FoodLog(t).remove(date, n));

export const setFoodNote = (date, text) => edit(FOOD_LOG, t => new FoodLog(t).setNote(date, text));

// ⚙ the marks: an icon and a name each (+ adds one); a mark keeps its tag, a new one gets the next
export async function editMarks() {
  await ready();
  const marks = marksOf();
  const v = await Form.ask(app, "✦ Marks", [{
    name: "Marks", key: "marks", required: ["icon", "name"],
    list: [{ name: "Icon", key: "icon", text: "🍫" }, { name: "Name", key: "name", text: "какао" }],
  }], { values: { marks: marks.map(m => ({ ...m })) }, required: ["marks"], submit: "Save" });

  if (!v) return;
  let n = Math.max(0, ...marks.map(m => Number(m.tag.slice(1)) || 0));
  const next = v.marks
    .map(m => ({ tag: m.tag ?? `m${++n}`, icon: m.icon.trim(), name: m.name.trim() }));

  await setFoodsProp("marks", next);
}

// 🏋 the training task: a past one from the search (its id goes to Foods.md), not a new name
export async function pickTrainingTask() {
  await ready();
  const pick = await pickTask();

  if (!pick) return;
  if (pick.isNew) return void new Notice("✦ pick a task you already have");
  await setFoodsProp("task", pick.id);
}
