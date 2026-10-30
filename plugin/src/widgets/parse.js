// A ```winx block's text: the widget's name on the first line, then "key: value" lines (a JSON value, else text).
//   ```winx
//   weight
//   input: true
//   ```
export function parseBlock(source) {
  const [name = "", ...rest] = source.split("\n").map(l => l.trim()).filter(Boolean);
  const args = {};
  for (const line of rest) {
    const i = line.indexOf(":");
    if (i < 1) continue;
    const value = line.slice(i + 1).trim();
    try { args[line.slice(0, i).trim()] = JSON.parse(value); } catch { args[line.slice(0, i).trim()] = value; }
  }
  return { name, args };
}

// The element whose data-action an event in a widget runs, or null: a click on a button (or anything else that
// isn't a field or a form), a field's change when the field itself has the action (not its form's), a form's submit.
export function actionOf(type, target, root) {
  const el = target.closest?.("[data-action]");
  if (!el || !root.contains(el)) return null;
  if (type === "click") return el.matches("input, select, textarea, form") || target.closest("input, select, textarea") ? null : el;
  if (type === "change") return el === target ? el : null;
  if (type === "submit") return el.matches("form") ? el : null;
  return null;
}
