// The ⚙ Settings window, in the shared Form window: the difficulties' XP and gold, the areas,
// XP Today's thresholds and the level cost (models/settings.js has its values). Resolves to the
// values, null when closed.
import { THEMES } from "#/helpers/config.js";
import { app } from "#/helpers/app.js";
import { Form } from "#/components/uikit/Form/index.ts";

const D = "Difficulties", A = "Areas", X = "XP Today & Level";
const number = (tab, name, key, text) => ({ tab, name, key, text, number: true });

export const settingsWindow = (config, values) => Form.ask(app, "✦ Settings", [
  { tab: "Appearance", name: "Theme", key: "theme", options: THEMES },
  { tab: D, name: D, key: "difficulties", fixed: true, required: ["xp", "gold"], list: [
    { name: "Difficulty", key: "label", label: true },
    { name: "XP", key: "xp", text: "XP", number: true, readonly: v => v.key === "none" },
    { name: "Gold", key: "gold", text: "gold", number: true },
  ] },
  { tab: A, name: A, key: "areas", required: ["key", "icon", "title"], list: [
    { name: "Key", key: "key", text: "body" },
    { name: "Icon", key: "icon", text: "🌺" },
    { name: "Name", key: "title", text: "Body" },
    { name: "On the radar", key: "name", text: "Vitality" },
    { name: "Colour", key: "color", text: "#e8609a", color: true },
    { name: "Apply", key: "apply", check: "a changed key: move its tasks to it" },
  ] },
  number(X, `XP Today · ${config.levels[1].name} up to`, "spark", "10"),
  number(X, `XP Today · ${config.levels[2].name} up to`, "glow", "20"),
  number(X, `XP Today · ${config.levels[3].name} up to (above: ${config.levels[4].name})`,
    "aura", "30"),
  number(X, "Level · the first one costs", "base", "100"),
  number(X, "Level · each next one costs more by", "step", "25"),
], {
  values,
  required: ["difficulties", "areas", "spark", "glow", "aura", "base", "step"],
  submit: "Save",
});
