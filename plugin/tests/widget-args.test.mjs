import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBlock } from "../src/widgets/parse.js";

test("a ```winx block: the widget's name, then key: value lines", () => {
  assert.deepEqual(parseBlock("weight"), { name: "weight", args: {} });
  assert.deepEqual(parseBlock("\n  weight \n"), { name: "weight", args: {} });
  assert.deepEqual(parseBlock("weight\ninput: true\ndays: 30"), { name: "weight", args: { input: true, days: 30 } });
  assert.deepEqual(parseBlock("shop\ntitle: Rewards: all\nbad line\n\nlist: [1, 2]"), { name: "shop", args: { title: "Rewards: all", list: [1, 2] } });
  assert.deepEqual(parseBlock(""), { name: "", args: {} });
});
