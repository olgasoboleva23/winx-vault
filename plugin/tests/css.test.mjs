import { test } from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync } from "node:fs";
import * as sass from "sass";

// While the old snippets are still in the repo: styles/main.scss must build to the same CSS as they do, in the
// order Obsidian applied them (by name), both through Sass (it flattens nesting). That nesting reads the same
// as the browser's is checked in Obsidian, by the computed styles (tests/obsidian/styles-snapshot.js).
const OLD = new URL("../../.obsidian/snippets/", import.meta.url);
const firstDiff = (a, b) => { let i = 0; while (i < a.length && a[i] === b[i]) i++; return i; };

test("styles/main.scss builds the old snippets", { skip: !existsSync(OLD) && "snippets moved" }, () => {
  const old = readdirSync(OLD).filter(f => f.endsWith(".css")).sort().map(f => readFileSync(new URL(f, OLD), "utf8")).join("\n");
  const want = sass.compileString(old).css;
  const got  = sass.compile(new URL("../styles/main.scss", import.meta.url).pathname).css;
  const i = firstDiff(got, want);
  assert.ok(i === got.length && i === want.length, `differs at ${i}:\n got: ${got.slice(i - 80, i + 120)}\nwant: ${want.slice(i - 80, i + 120)}`);
});
