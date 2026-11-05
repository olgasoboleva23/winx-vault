import { test } from "node:test";
import assert from "node:assert/strict";
import { appendLine, edit, editLine, moveLine, readJson, undoLines } from "../src/helpers/files.js";
import { setApp } from "../src/helpers/app.js";
import { Notice } from "obsidian";

// a vault in memory: path → text, folders as a set
const vault = (files = {}, folders = []) => {
  const dirs = new Set(folders);
  setApp({ vault: {
    getFileByPath: p => p in files ? { path: p } : null,
    getFolderByPath: p => dirs.has(p) ? { path: p } : null,
    process: async (f, fn) => { files[f.path] = fn(files[f.path]); },
    create: async (p, text) => { files[p] = text; },
    createFolder: async p => { dirs.add(p); },
  } });
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
  const any = () => true;
  await editLine("a.md", 1, any, l => l.toUpperCase());
  assert.equal(files["a.md"], "a\nB\nc");
  await editLine("a.md", 0, any, () => null);
  assert.equal(files["a.md"], "B\nc");
  await editLine("a.md", 9, any, () => "zzz");
  assert.equal(files["a.md"], "B\nc");
});

test("editLine writes only when the line is still the same: else nothing, false and a notice", async () => {
  const { files } = vault({ "a.md": "- [ ] tea\n- [ ] milk" });
  Notice.last = null;
  assert.equal(await editLine("a.md", 0, l => l.includes("milk"), () => "- [x] milk"), false);
  assert.equal(files["a.md"], "- [ ] tea\n- [ ] milk");
  assert.match(String(Notice.last), /changed/);
  assert.equal(await editLine("a.md", 1, l => l.includes("milk"), () => "- [x] milk"), true);
  assert.equal(files["a.md"], "- [ ] tea\n- [x] milk");
});

test("edit on a missing note does nothing", async () => {
  const { files } = vault();
  await edit("nope.md", () => "x");
  assert.deepEqual(files, {});
});

test("readJson: the parsed file; the fallback when it's missing; an error when it isn't JSON (so nothing saves over it)", async () => {
  const files = { "a.json": '{"n": 1}', "b.json": "not json" };
  setApp({ vault: { adapter: { exists: async p => p in files, read: async p => p in files ? files[p] : Promise.reject(new Error("missing")) } } });
  assert.deepEqual(await readJson("a.json"), { n: 1 });
  assert.deepEqual(await readJson("c.json", { budgets: {} }), { budgets: {} });
  assert.equal(await readJson("c.json"), null);
  await assert.rejects(readJson("b.json", {}), SyntaxError);
});

test("undoLines puts a deleted line back once: a second undo adds no copy", async () => {
  const { files } = vault({ "a.md": "a\nc" });
  const undo = undoLines("a.md", 1, [], "b");
  await undo(); await undo();
  assert.equal(files["a.md"], "a\nb\nc");
});

test("undoLines puts a deleted line back between its old neighbours, though a line came in above", async () => {
  const { files } = vault({ "a.md": "new\na\nc" });   // "b" was deleted between a and c, then "new" went on top
  await undoLines("a.md", 1, [], "b", { above: "a", below: "c" })();
  assert.equal(files["a.md"], "new\na\nb\nc");
});

test("undoLines leaves lines that changed since", async () => {
  const { files } = vault({ "a.md": "a\nB2\nc" });
  await undoLines("a.md", 1, ["B"], "b")();
  assert.equal(files["a.md"], "a\nB2\nc");
});

test("moveLine puts a line, with the lines indented under it, before or after another (and its own)", async () => {
  const { files } = vault({ "a.md": "- [ ] a\n- [ ] b\n  - note\n- [ ] c\n  - c's note\n- [ ] d" });
  const any = () => true;
  assert.equal(await moveLine("a.md", 1, any, 3, any, true), true);   // b after c (and c's note)
  assert.equal(files["a.md"], "- [ ] a\n- [ ] c\n  - c's note\n- [ ] b\n  - note\n- [ ] d");
  await moveLine("a.md", 5, any, 0, any, false);                          // d before a
  assert.equal(files["a.md"], "- [ ] d\n- [ ] a\n- [ ] c\n  - c's note\n- [ ] b\n  - note");
});

test("moveLine writes only when both lines are still the same: else nothing, false and a notice", async () => {
  const { files } = vault({ "a.md": "- [ ] tea\n- [ ] milk" });
  const tea = l => l.includes("tea"), bread = l => l.includes("bread");
  Notice.last = null;
  assert.equal(await moveLine("a.md", 0, tea, 1, bread, true), false);
  assert.equal(await moveLine("a.md", 1, tea, 0, tea, false), false);
  assert.equal(files["a.md"], "- [ ] tea\n- [ ] milk");
  assert.match(String(Notice.last), /changed/);
});
