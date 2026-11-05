import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlock } from "#/controllers/blocks.js";

test("a ```winx block: the widget's name, then key: value lines", () => {
  assert.deepEqual(parseBlock("weight"), { name: "weight", args: {} });
  assert.deepEqual(parseBlock("\n  weight \n"), { name: "weight", args: {} });
  assert.deepEqual(parseBlock("weight\ninput: true\ndays: 30"), { name: "weight", args: { input: true, days: 30 } });
  assert.deepEqual(parseBlock("shop\ntitle: Rewards: all\nbad line\n\nlist: [1, 2]"), { name: "shop", args: { title: "Rewards: all", list: [1, 2] } });
  assert.deepEqual(parseBlock(""), { name: "", args: {} });
});

test("every widget that follows the vault names its files (watches): no reload for any other note", async () => {
  const { blocks } = await import("#/controllers/blocks.js");

  for (const [name, def] of Object.entries(blocks))
    if (def.follows !== false) assert.ok(Array.isArray(def.watches), `${name} names its files`);
});
