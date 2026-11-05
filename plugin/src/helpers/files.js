// Writes to the vault's notes by path (Obsidian's app; inside Obsidian only).
// edit: the note's text through fn (vault.process, so nothing is lost between read and write); a
// missing note:
//   nothing.
// editLine: line n through fn(line, lines) (null deletes it), only while same(line) holds: it may
// have moved or
//   changed since it was read (a line that's gone or isn't the same: nothing, a notice, false).
// moveLine: line n, with the lines indented under it, before line `to` (after: after it and its
//   own), only while same(line n) and sameTo(line `to`) hold (else nothing, a notice, false).
// undoLines: () => put `before` back in place of `added` (a deleted line: []), once, while they're
//   still there: near line `at`, between its old neighbours when they're given ({ above, below }:
//   lines above may have come or gone since).
// appendLine: a line at the end (unique: not when it's already there); a missing note is made with
// `header` on top.
import { Notice } from "obsidian";
import { app } from "./app.js";

export const edit = (path, fn) => {
  const file = app.vault.getFileByPath(path);

  return file ? app.vault.process(file, fn) : Promise.resolve();
};

// the note's lines through fn(lines): the new lines, or null when a line isn't what it was (then
// nothing written, a notice, false)
async function editChecked(path, fn) {
  let done = false;
  await edit(path, c => {
    const lines = fn(c.split("\n"));

    done = lines !== null;
    return done ? lines.join("\n") : c;
  });
  if (!done) new Notice("The line changed meanwhile, nothing written");
  return done;
}

export const editLine = (path, n, same, fn) => editChecked(path, lines => {
  if (lines[n] === undefined || !same(lines[n])) return null;
  const next = fn(lines[n], lines);

  next === null ? lines.splice(n, 1) : (lines[n] = next);
  return lines;
});

export const moveLine = (path, n, same, to, sameTo, after) => editChecked(path, lines => {
  const indent = l => l.match(/^\s*/)[0].length;
  // a line and the lines indented under it: how many
  const block = i => {
    let k = i + 1;

    while (k < lines.length && lines[k].trim() && indent(lines[k]) > indent(lines[i])) k++;
    return k - i;
  };

  if (n === to || lines[n] === undefined || lines[to] === undefined) return null;
  if (!same(lines[n]) || !sameTo(lines[to])) return null;
  const moved = lines.splice(n, block(n));
  const at = to > n ? to - moved.length : to;

  lines.splice(after ? at + block(at) : at, 0, ...moved);
  return lines;
});

export function undoLines(path, at, added, before, around = null) {
  let done = false;
  const fits = (lines, p) => lines.slice(p, p + added.length).join("\n") === added.join("\n")
    && p + added.length <= lines.length
    && (!around || lines[p - 1] === around.above && lines[p + added.length] === around.below);

  return () => done ? Promise.resolve() : edit(path, c => {
    const lines = c.split("\n");
    // the nearest place to `at` that fits
    const p = around
      ? [...lines.keys(), lines.length]
        .sort((a, b) => Math.abs(a - at) - Math.abs(b - at))
        .find(p => fits(lines, p))
      : fits(lines, at) ? at : undefined;

    if (done || p === undefined) return c;   // changed since
    done = true;
    lines.splice(p, added.length, before);
    return lines.join("\n");
  });
}

export async function appendLine(path, line, { header = "", unique = false } = {}) {
  const file = app.vault.getFileByPath(path);

  if (file) return app.vault.process(file, c =>
    unique && c.split("\n").includes(line) ? c : `${c.replace(/\s+$/, "")}\n${line}\n`);
  const folder = path.slice(0, path.lastIndexOf("/"));

  if (folder && !app.vault.getFolderByPath(folder)) await app.vault.createFolder(folder);
  await app.vault.create(path, `${header}${line}\n`);
}

// a JSON file (by the adapter: any file, not only notes), parsed; `fallback` when it's missing. A
// file that isn't JSON throws, so nothing is saved over it (the pomodoro's stats) and the widget
// says it couldn't draw
export const readJson = async (path, fallback = null) =>
  await app.vault.adapter.exists(path) ? JSON.parse(await app.vault.adapter.read(path)) : fallback;
