import { test } from "node:test";
import assert from "node:assert/strict";
import { collection } from "#/helpers/collection.js";
import { setApp } from "#/helpers/app.js";

const P = "Data/x.json";

// a vault in memory: path → text
const vault = (files = {}) => {
  setApp({ vault: {
    getFileByPath: p => p in files ? { path: p } : null,
    getFolderByPath: () => ({}),
    process: async (f, fn) => { files[f.path] = fn(files[f.path]); },
    create: async (p, text) => { files[p] = text; },
    createFolder: async () => {},
  } });
  return files;
};

test("load: records in file order", () => {
  const c = collection(P);

  c.load({ b: {}, a: {} });
  assert.deepEqual([...c.records.keys()], ["b", "a"]);
});

test("add: ids from the file, two in a row; a missing file is made", async () => {
  const files = vault({});
  const c = collection(P);

  assert.equal(await c.add({ n: 1 }, "p"), "p1");
  assert.equal(await c.add({ n: 2 }, "p"), "p2");
  assert.equal(files[P], JSON.stringify({ p1: { n: 1 }, p2: { n: 2 } }, null, 2));
});

test("update: merges via fn; a missing id or null writes nothing and is false", async () => {
  const files = vault({ [P]: JSON.stringify({ p1: { a: 1 } }, null, 2) });
  const c = collection(P);

  assert.equal(await c.update("p1", r => ({ ...r, b: 2 })), true);
  assert.deepEqual(JSON.parse(files[P]), { p1: { a: 1, b: 2 } });

  let called = false;

  assert.equal(await c.update("p9", r => { called = true; return r; }), false);
  assert.equal(called, false);

  const before = files[P];

  assert.equal(await c.update("p1", () => null), false);
  assert.equal(files[P], before);

  const empty = vault({});

  assert.equal(await collection(P).update("p1", r => r), false);
  assert.ok(!(P in empty));
});

test("a file that isn't JSON: update rejects, the file is untouched", async () => {
  const files = vault({ [P]: "{ half" });

  await assert.rejects(collection(P).update("p1", r => r));
  assert.equal(files[P], "{ half");
});

test("edit: true when written, false on null", async () => {
  vault({ [P]: "{}" });
  const c = collection(P);

  assert.equal(await c.edit(all => ({ ...all, a: {} })), true);
  assert.equal(await c.edit(() => null), false);
});
