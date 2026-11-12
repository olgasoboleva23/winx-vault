// The one-off move of the food journal from its notes to JSON: Foods.md (properties `marks` and
// `task`, a food per line, "- f12 каша с 4 ч #m1") to food.json, Log.md ("- 2026-11-09 f12",
// "- 2026-11-09 note: …") to log.json; the notes kept as "Foods (old).md", "Log (old).md".
// foodFromNotes pure (tested), migrateFood() the command. The old line format lives here only.
import { Notice } from "obsidian";
import { app } from "#/helpers/app.js";
import { editJson, readJson } from "#/helpers/files.js";
import { FOOD_DATA, FOOD_LOG, FOOD_LOG_NOTE, FOODS_NOTE } from "#/helpers/paths.js";
import { withEaten, withFood, withNote } from "#/models/food.js";

const FOOD = /^- (f\d+) (.+?)((?: #m\d+)*)$/;
const EATEN = /^- (\d{4}-\d{2}-\d{2}) (f\d+)$/, NOTE = /^- (\d{4}-\d{2}-\d{2}) note: (.*)$/;

// a note's lines past its front matter, the blank ones left out
const lines = text => text.replace(/^---\n[\s\S]*?\n---\n/, "").split("\n").filter(l => l.trim());

// the front matter's text ("" without one)
const frontMatter = text => text.match(/^---\n([\s\S]*?)\n---\n/)?.[1] ?? "";

// the two objects, and how many lines matched neither format. Throws when a property in the
// front matter isn't in `fm` (Obsidian's cache not built yet), or when a line read is lost on the
// way (a food id twice, a day's second note, a note cleared by an empty one): nothing to write.
export function foodFromNotes(foodsText, fm, logText) {
  for (const key of ["marks", "task"]) {
    if (new RegExp(`^${key}:`, "m").test(frontMatter(foodsText)) && fm[key] == null)
      throw new Error(`Foods.md's ${key} not read yet, try again in a moment`);
  }

  let food = { ...(fm.marks && { marks: fm.marks }), ...(fm.task && { task: fm.task }), foods: {} };
  let log = {}, skipped = 0;
  const read = { foods: 0, eaten: 0, notes: 0 };

  for (const l of lines(foodsText)) {
    const m = l.match(FOOD);

    if (m) food = withFood(food, { id: m[1], name: m[2], marks: m[3].split(" #").filter(Boolean) });
    else skipped++;
    if (m) read.foods++;
  }

  for (const l of lines(logText)) {
    const e = l.match(EATEN), n = l.match(NOTE);

    if (e) log = withEaten(log, e[1], e[2]);
    else if (n) log = withNote(log, n[1], n[2]);
    else skipped++;
    if (e) read.eaten++;
    if (n?.[2].trim()) read.notes++;
  }

  const days = Object.values(log);
  const kept = {
    foods: Object.keys(food.foods).length, eaten: days.flatMap(d => d.eaten).length,
    notes: days.filter(d => d.note).length,
  };

  if (kept.foods !== read.foods)
    throw new Error(`Foods.md: ${kept.foods} foods kept of ${read.foods} food lines`);
  if (kept.eaten !== read.eaten)
    throw new Error(`Log.md: ${kept.eaten} eaten kept of ${read.eaten} eaten lines`);
  if (kept.notes !== read.notes)
    throw new Error(`Log.md: ${kept.notes} day notes kept of ${read.notes} note lines`);

  return { food, log, skipped };
}

const has = json => Object.keys(json).length > 0;

// the file written only while it's still empty
const fresh = (path, data) => editJson(path, old => {
  if (has(old)) throw new Error(`${path.split("/").pop()} has data`);
  return data;
});

// Explicit command only. Twice: "already migrated", nothing written.
export async function migrateFood() {
  const { vault, metadataCache, fileManager } = app;
  const oldPath = path => path.replace(/\.md$/, " (old).md");

  try {
    const full = [];

    for (const path of [FOOD_DATA, FOOD_LOG])
      if (has(await readJson(path, {}))) full.push(path.split("/").pop());
    if (full.length)
      return void new Notice(`✦ food is already migrated: ${full.join(", ")} `
        + `${full.length > 1 ? "have" : "has"} data`);
    const foods = vault.getFileByPath(FOODS_NOTE), logNote = vault.getFileByPath(FOOD_LOG_NOTE);

    if (!foods) return void new Notice("✦ nothing to migrate");
    const notes = [foods, logNote].filter(Boolean);
    const taken = notes.map(f => oldPath(f.path)).find(p => vault.getAbstractFileByPath(p));

    if (taken) throw new Error(`${taken.split("/").pop()} already exists`);
    const fm = metadataCache.getFileCache(foods)?.frontmatter ?? {};
    const { food, log, skipped } =
      foodFromNotes(await vault.read(foods), fm, logNote ? await vault.read(logNote) : "");

    await fresh(FOOD_DATA, food);
    await fresh(FOOD_LOG, log);
    for (const f of notes) await fileManager.renameFile(f, oldPath(f.path));

    const days = Object.values(log), eaten = days.reduce((n, d) => n + d.eaten.length, 0);

    new Notice(`✦ food migrated: ${Object.keys(food.foods).length} foods, `
      + `${food.marks?.length ?? 0} marks, ${days.length} days (${eaten} eaten, `
      + `${days.filter(d => d.note).length} notes); ${skipped} lines not understood`);
  } catch (e) {
    new Notice(`✦ migration stopped: ${e.message}`);
  }
}
