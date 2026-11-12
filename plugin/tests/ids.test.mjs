import { test } from "node:test";
import assert from "node:assert/strict";
import { nextId } from "#/helpers/ids.js";

test("nextId: the biggest prefix<N> plus one; other keys skipped", () => {
  assert.equal(nextId("m", ["m2", "m10", null, "x7"]), "m11");
  assert.equal(nextId("t", []), "t1");
  assert.equal(nextId("t", ["t3", "tea"]), "t4");
});
