// The task window: what the Tasks plugin's dialog doesn't ask (difficulty, area, time of day,
// sticker), in the shared Form window. Used to edit a task (controllers/tasks.js) and for a new one
// (the New task command).
import config from "#/helpers/config.js";
import { app } from "#/helpers/app.js";
import { STICKERS } from "#/helpers/paths.js";
import { Form } from "#/components/uikit/Form/index.ts";

// What the Tasks modal doesn't ask: difficulty, area, time of day, sticker (from 00
// System/Assets/stickers); `preset` (Task#picks, plus `name` for a pool item) has the current
// ones. A new task must have a difficulty and an area (`required`) and can go to the pool instead
// (a "to pool" checkbox: pick.pool). Resolves to the picks, null when closed.
export const taskWindow = async (preset = {}, required = false) => {
  const { difficulties, areas } = config;
  const stickers = (app.vault.getFolderByPath(STICKERS)?.children ?? [])
    .sort((a, b) => a.name.localeCompare(b.name));

  return Form.ask(app, required ? "✦ New task" : "✦ Edit task", [
    // a pool item's rename (a task with a line is renamed in the Tasks dialog)
    ...("name" in preset ? [{ name: "Name", key: "name", text: "name" }] : []),
    {
      name: "Difficulty", key: "difficulty",
      options: difficulties.map(d => ({ label: `${d.label} (${d.xp} XP)`, value: d.key })),
    },
    { name: "Area", key: "area", options: areas.map(a => ({ label: a.label, value: a.key })) },
    // any task's time of day: a one-off goes morning / evening in its day, a 🔁 box groups by it
    { name: "Time of day", key: "daytime", options: [
      { label: "—", value: null },
      { label: "🌅 morning", value: "morning" },
      { label: "🌙 evening", value: "evening" },
    ] },
    { name: "Sticker", key: "sticker", options: [
      { label: "—", value: null },
      ...stickers.map(f => ({ label: f.name, value: f.name, img: f })),
    ] },
    // the pool: tasks to pick when it's time (the calendar's Pool tab); no dates
    ...(required
      ? [{
        name: "To pool", key: "pool", check: "pick it from the calendar's Pool tab when it's time",
      }]
      : []),
  ], {
    values: { difficulty: null, area: null, daytime: null, sticker: null, ...preset },
    required: required ? ["difficulty", "area"] : [],
  });
};
