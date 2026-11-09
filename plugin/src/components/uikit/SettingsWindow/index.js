// The ⚙ Settings window, in the shared Form window: the difficulties' XP and gold, the areas,
// XP Today's thresholds and the level cost (models/settings.js has its values). Resolves to the
// values, null when closed.
import { app } from "#/helpers/app.js";
import { Form } from "#/components/uikit/Form/index.ts";

export const settingsWindow = (config, values) => Form.ask(app, "✦ Settings", [
  ...config.difficulties.flatMap(d => [
    { name: `${d.label} · XP`, key: `xp_${d.key}`, text: String(d.xp), number: true },
    { name: `${d.label} · gold`, key: `gold_${d.key}`, text: String(d.gold), number: true },
  ]),
  { name: "Areas", key: "areas", required: ["key", "icon", "title"], list: [
    { name: "Key (in the tasks)", key: "key", text: "body" },
    { name: "Icon", key: "icon", text: "🌺" },
    { name: "Name", key: "title", text: "Body" },
    { name: "Life Areas name", key: "name", text: "Vitality" },
    { name: "Colour", key: "color", text: "#e8609a" },
    { name: "Apply", key: "apply", check: "a changed key: move its tasks to it" },
  ] },
  { name: "XP Today · SPARK up to", key: "spark", text: "10", number: true },
  { name: "XP Today · GLOW up to", key: "glow", text: "20", number: true },
  { name: "XP Today · AURA up to (above: TRANSFORMATION)", key: "aura", text: "30", number: true },
  { name: "Level · first one costs", key: "base", text: "100", number: true },
  { name: "Level · each next one more by", key: "step", text: "25", number: true },
], {
  values,
  required: ["areas", ...config.difficulties.flatMap(d => [`xp_${d.key}`, `gold_${d.key}`]),
    "spark", "glow", "aura", "base", "step"],
  submit: "Save",
});
