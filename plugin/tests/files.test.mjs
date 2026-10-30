import { test } from "node:test";
import assert from "node:assert/strict";
import { appendLine, edit, editLine } from "../src/lib/files.js";

// a vault in memory: path → text, folders as a set
const vault = (files = {}, folders = []) => {
  const dirs = new Set(folders);
  globalThis.app = { vault: {
    getFileByPath: p => p in files ? { path: p } : null,
    getFolderByPath: p => dirs.has(p) ? { path: p } : null,
    process: async (f, fn) => { files[f.path] = fn(files[f.path]); },
    create: async (p, text) => { files[p] = text; },
    createFolder: async p => { dirs.add(p); },
  } };
  return { files, dirs };
};

test("appendLine adds a line at the end, after trimming trailing blank lines", async () => {
  const { files } = vault({ "a.md": "# A\n\n- one\n\n" });
  await appendLine("a.md", "- two");
  assert.equal(files["a.md"], "# A\n\n- one\n- two\n");
});

test("appendLine with unique leaves a line that's already there", async () => {
  const { files } = vault({ "a.md": "- start:: 2026-10-01\n" });
  await appendLine("a.md", "- start:: 2026-10-01", { unique: true });
  assert.equal(files["a.md"], "- start:: 2026-10-01\n");
});

test("appendLine makes a missing note, its folder first, with the header on top", async () => {
  const { files, dirs } = vault();
  await appendLine("x/y/c.md", "- one", { header: "# C\n\n" });
  assert.ok(dirs.has("x/y"));
  assert.equal(files["x/y/c.md"], "# C\n\n- one\n");
});

test("editLine changes one line, null deletes it, a line that's gone changes nothing", async () => {
  const { files } = vault({ "a.md": "a\nb\nc" });
  await editLine("a.md", 1, l => l.toUpperCase());
  assert.equal(files["a.md"], "a\nB\nc");
  await editLine("a.md", 0, () => null);
  assert.equal(files["a.md"], "B\nc");
  await editLine("a.md", 9, () => "zzz");
  assert.equal(files["a.md"], "B\nc");
});

test("edit on a missing note does nothing", async () => {
  const { files } = vault();
  await edit("nope.md", () => "x");
  assert.deepEqual(files, {});
});
