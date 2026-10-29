import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync, readdirSync } from "node:fs";

const dist = new URL("../dist/", import.meta.url);

test("build makes a plugin the phone can load", () => {
  execFileSync("npm", ["run", "build"], { cwd: new URL("..", import.meta.url), stdio: "pipe" });
  assert.deepEqual(readdirSync(dist).sort(), ["main.js", "manifest.json", "styles.css"]);
  const manifest = JSON.parse(readFileSync(new URL("manifest.json", dist), "utf8"));
  assert.equal(manifest.id, "winx");
  assert.equal(manifest.isDesktopOnly, false);
  const main = readFileSync(new URL("main.js", dist), "utf8");
  assert.doesNotMatch(main, /require\(["'](fs|electron|path|child_process)["']\)/);   // Node/Electron only: no phone
});
