// Task lines: rewrite one where it is (found again by its words), with an undo notice; the task window
// (difficulty, area, time, sticker) and the Tasks plugin's edit dialog.
import { Notice } from "obsidian";
import config from "../core/config.js";
import { edit, editLine } from "../core/files.js";
import { tasksApi } from "../core/plugins.js";
import { Task } from "./task.js";
import { Form } from "../uikit/form.ts";

// Rewrite a Dataview task's line in its file (fn returns the new line, null deletes it),
// only if that line is still the same task.
export const editTaskLine = (t, fn) => editLine(t.path, t.line, line => Task.keyOf(line) === Task.keyOf(t.text) ? fn(line) : line);

// What the Tasks modal doesn't ask: difficulty, area, time of day, sticker (from 00 System/Assets/stickers);
// `preset` (Task#picks) has the current ones. A new task must have a difficulty and an area (`required`) and can
// go to the pool instead (a "to pool" checkbox: pick.pool). Resolves to the picks, null when closed.
export const taskWindow = async (preset = {}, required = false) => {
  const { difficulties, areas } = config;
  const stickers = (app.vault.getFolderByPath("00 System/Assets/stickers")?.children ?? []).sort((a, b) => a.name.localeCompare(b.name));
  return Form.ask(app, required ? "✦ New task" : "✦ Edit task", [
    { name: "Difficulty", key: "difficulty", options: difficulties.map(d => ({ label: `${d.label} (${d.xp} XP)`, value: d.tag })) },
    { name: "Area", key: "area", options: areas.map(a => ({ label: a.label, value: a.tag })) },
    // a routine's time of day: the calendar groups its 🔁 box by it
    { name: "Time of day", key: "time", options: [{ label: "—", value: null }, { label: "🌅 morning", value: "#time/morning" }, { label: "🌙 evening", value: "#time/evening" }] },
    { name: "Sticker", key: "sticker", options: [{ label: "—", value: null }, ...stickers.map(f => ({ label: f.name, value: f.name, img: f }))] },
    // Pool.md: tasks to pick when it's time (the calendar's Pool tab); no dates
    ...(required ? [{ name: "To pool", key: "pool", check: "pick it from the calendar's Pool tab when it's time" }] : []),
  ], { values: { difficulty: null, area: null, time: null, sticker: null, ...preset }, required: required ? ["difficulty", "area"] : [] });
};

// Edit a task: the task window, then the Tasks plugin's own edit dialog (text, dates; works on the phone).
// Cancelling either changes nothing. A pool line (t.pool) goes through the dialog as a task and comes back
// as a pool line (any dates set there are dropped).
export const editTaskModal = async t => {
  const api  = tasksApi();
  const line = (await app.vault.cachedRead(app.vault.getAbstractFileByPath(t.path))).split("\n")[t.line];
  if (!api || Task.keyOf(line ?? "") !== Task.keyOf(t.text)) return;
  const was  = new Task(line).picks;
  const pick = await taskWindow(was);
  if (!pick) return;
  // the picks go in first, so the Tasks dialog shows them; nothing is written until it saves
  const changed = Object.fromEntries(Object.entries(pick).filter(([k, v]) => v !== was[k]));
  const asTask = t.pool ? line.replace(/^(\s*)- /, "$1- [ ] ") : line;
  const edited = await api.editTaskLineModal(new Task(asTask).withPicks(changed));   // "" when cancelled
  const next = edited && (t.pool ? new Task(edited).poolLine : edited);
  if (next && next !== line) await editTaskLine(t, () => next);
};

// Change a task's line like editTaskLine (fn may return several lines, or null to delete), then show
// a notice "<mark> <task>  undo" for 8 s; undo puts the old line back if the new lines are still there.
export const editTaskLineWithUndo = async (t, fn, mark) => {
  let before = null, after = null;
  await editTaskLine(t, line => { before = line; return after = fn(line); });
  if (before === null) return;
  const added = after === null ? [] : after.split("\n");
  const frag  = document.createDocumentFragment();
  frag.append(`${mark} ${new Task(before).text.slice(0, 40)}  `);
  const undo = frag.appendChild(document.createElement("button"));
  undo.textContent = "undo";
  undo.onclick = () => edit(t.path, c => {
    const lines = c.split("\n");
    if (lines.slice(t.line, t.line + added.length).join("\n") !== added.join("\n")) return c;   // changed since
    lines.splice(Math.min(t.line, lines.length), added.length, before);
    return lines.join("\n");
  });
  new Notice(frag, 8000);
};
export const deleteTaskLine = t => editTaskLineWithUndo(t, () => null, "🗑");
