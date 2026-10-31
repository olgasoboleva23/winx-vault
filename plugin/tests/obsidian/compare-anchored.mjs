// node compare-anchored.mjs before.json after.json ANCHOR [--no-geometry] — compares the elements below the first
// element whose path step starts with ANCHOR (e.g. "DIV.winx-stat-card"), by their path from there: the same widget
// in a different place (a card moved into a block). Prints differences and a count.
import { readFileSync } from "node:fs";
const [fa, fb, anchor] = process.argv.slice(2);
const SKIP = process.argv.includes("--no-geometry") ? [2, 3, 4, 5] : [];
const cut = shot => Object.fromEntries(Object.entries(JSON.parse(readFileSync(shot, "utf8")))
  .map(([k, v]) => { k = k.replace(/\.winx-btn/g, ""); const i = k.indexOf(anchor); return i < 0 ? null : [k.slice(i).replace(/^([^>]*):\d+/, "$1"), v.split("|").map((x, j) => SKIP.includes(j) ? "" : x).join("|")]; })
  .filter(Boolean));
const [a, b] = [cut(fa), cut(fb)];
const keys = new Set([...Object.keys(a), ...Object.keys(b)]);
const diff = [...keys].filter(k => a[k] !== b[k]);
for (const k of diff.slice(0, 20)) {
  if (!(k in a) || !(k in b)) { console.log(`${k in a ? "only before" : "only after"}: ${k.slice(-140)}`); continue; }
  const [x, y] = [a[k].split("|"), b[k].split("|")];
  console.log(k.slice(-140), x.map((v, i) => v !== y[i] ? `\n   [${i}] ${v.slice(0, 70)} → ${y[i].slice(0, 70)}` : "").join(""));
}
console.log(`${diff.length} of ${keys.size} differ (below ${anchor})`);
