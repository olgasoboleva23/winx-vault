// Writes to the vault's notes by path (Obsidian's app; inside Obsidian only).
// edit: the note's text through fn (vault.process, so nothing is lost between read and write); a missing note: nothing.
// editLine: line n through fn (null deletes it; a line that's gone: nothing).
// appendLine: a line at the end (unique: not when it's already there); a missing note is made with `header` on top.
export const edit = (path, fn) => {
  const file = app.vault.getFileByPath(path);
  return file ? app.vault.process(file, fn) : Promise.resolve();
};

export const editLine = (path, n, fn) => edit(path, c => {
  const lines = c.split("\n");
  if (lines[n] === undefined) return c;
  const next = fn(lines[n]);
  next === null ? lines.splice(n, 1) : (lines[n] = next);
  return lines.join("\n");
});

export async function appendLine(path, line, { header = "", unique = false } = {}) {
  const file = app.vault.getFileByPath(path);
  if (file) return app.vault.process(file, c => unique && c.split("\n").includes(line) ? c : `${c.replace(/\s+$/, "")}\n${line}\n`);
  const folder = path.slice(0, path.lastIndexOf("/"));
  if (folder && !app.vault.getFolderByPath(folder)) await app.vault.createFolder(folder);
  await app.vault.create(path, `${header}${line}\n`);
}

// a JSON file (by the adapter: any file, not only notes), parsed; `fallback` when it's missing or not JSON
export const readJson = (path, fallback = null) => app.vault.adapter.read(path).then(JSON.parse).catch(() => fallback);
