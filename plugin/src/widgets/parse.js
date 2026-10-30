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
