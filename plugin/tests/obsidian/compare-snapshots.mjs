// node compare-snapshots.mjs a.json b.json [--no-geometry] — elements whose computed styles differ (first 30), and
// a count. --no-geometry leaves out top, left, width, height (the same widget in a wider or narrower place).
import { readFileSync } from "node:fs";
const files = process.argv.slice(2).filter(f => !f.startsWith("--"));
const SKIP = process.argv.includes("--no-geometry") ? [2, 3, 4, 5] : [];
const strip = v => v === undefined ? v : v.split("|").map((x, i) => SKIP.includes(i) ? "" : x).join("|");
const [a, b] = files.map(f => Object.fromEntries(Object.entries(JSON.parse(readFileSync(f, "utf8"))).map(([k, v]) => [k, strip(v)])));
const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
const diff = [...keys].filter(k => a[k] !== b[k]);
const PROPS = 34;
for (const k of diff.slice(0, 30)) {
  if (!(k in a) || !(k in b)) { console.log(`${k in a ? "only before" : "only after"}: ${k.slice(-160)}`); continue; }
  const [x, y] = [a[k].split("|"), b[k].split("|")];
  console.log(k.slice(-160), x.map((v, i) => v !== y[i] ? `\n   [${i}] ${v.slice(0, 80)} → ${y[i].slice(0, 80)}` : "").join(""));
}
console.log(`${diff.length} of ${keys.size} differ`);
process.exit(diff.length ? 1 : 0);
