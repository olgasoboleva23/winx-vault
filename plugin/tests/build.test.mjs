import { test } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

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

test("a Sass error fails the build", () => {
  // a copy of the plugin with a broken stylesheet, sharing node_modules
  const tmp = mkdtempSync(join(tmpdir(), "winx-build-"));
  const here = fileURLToPath(new URL("..", import.meta.url));
  for (const f of ["src", "styles", "esbuild.config.mjs", "manifest.json", "package.json"]) cpSync(join(here, f), join(tmp, f), { recursive: true });
  symlinkSync(join(here, "node_modules"), join(tmp, "node_modules"));
  writeFileSync(join(tmp, "styles/main.scss"), ".a { color: ");
  try {
    assert.throws(() => execFileSync("node", ["esbuild.config.mjs"], { cwd: tmp, stdio: "pipe" }));
  } finally { rmSync(tmp, { recursive: true, force: true }); }
});
