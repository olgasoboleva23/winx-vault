import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";

// Obsidian's Component runs a block through these; a widget's own method by the same name stops it from drawing
// (read from the source: some widgets import .ts files node can't load)
const LIFECYCLE = /^\s+(?:async\s+)?(load|unload|addChild|removeChild|register|registerEvent|registerDomEvent|registerInterval)\s*\(/m;

test("no widget has a method named like Component's lifecycle (load, unload, register…)", () => {
  const dir = new URL("../src/widgets/", import.meta.url);
  for (const f of readdirSync(dir, { recursive: true }).filter(f => /\.(js|ts)$/.test(f)))
    assert.equal(readFileSync(new URL(f, dir), "utf8").match(LIFECYCLE)?.[1], undefined, `${f} has its own one`);
});
