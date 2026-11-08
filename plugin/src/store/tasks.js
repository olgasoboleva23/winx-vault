// The tasks of 00 System/Data/Tasks, read by the plugin itself and kept up to date: `tasks` (every
// task of every note there, Master.md's first), `pool` (the plain lines of Pool.md), `ready` (the
// first read is done), `version` (a Vue ref, bumped on every change: a computed that reads it is
// worked out again). useTaskStore(plugin) starts it once the vault is loaded; a note of the folder
// saved, made, deleted or renamed is read again on Obsidian's own event, at once (Dataview's index
// comes a second later, and only once it's built).
import { ref } from "vue";
import { app } from "#/helpers/app.js";
import { parseNote } from "#/models/taskFile.js";
import { POOL, TASKS } from "#/helpers/paths.js";

const FOLDER = `${TASKS}/`;
const byPath = new Map();   // path → its items

const refresh = () => {
  const paths = [...byPath.keys()]
    .sort((a, b) => (a === POOL) - (b === POOL) || a.localeCompare(b));
  const items = paths.flatMap(p => byPath.get(p));

  taskStore.tasks = items.filter(i => i.status !== null);
  taskStore.pool = items.filter(i => i.status === null && i.path === POOL);
  taskStore.version.value++;
};

export const taskStore = {
  tasks: [], pool: [], ready: false, version: ref(0),
  // the note's items set from its text (a test's, or a write the plugin just made)
  put(path, text) { byPath.set(path, parseNote(path, text)); refresh(); },
  drop(path) { reads.delete(path); if (byPath.delete(path)) refresh(); },
};

const inFolder = path => path.startsWith(FOLDER) && path.endsWith(".md");
const reads = new Map();   // path → its last read's number: an older read, or one of a note dropped
                           // since, is not put
const read = async file => {
  const n = (reads.get(file.path) ?? 0) + 1;

  reads.set(file.path, n);
  const text = await app.vault.cachedRead(file);

  if (reads.get(file.path) === n) taskStore.put(file.path, text);
};

export function useTaskStore(plugin) {
  const changed = f => { if (inFolder(f.path)) void read(f); };

  plugin.registerEvent(app.vault.on("modify", changed));
  plugin.registerEvent(app.vault.on("create", changed));
  plugin.registerEvent(app.vault.on("delete", f => inFolder(f.path) && taskStore.drop(f.path)));
  plugin.registerEvent(app.vault.on("rename", (f, old) => {
    if (inFolder(old)) taskStore.drop(old);
    changed(f);
  }));
  // the first read, once the vault's files are there: now when the layout is ready (the plugin
  // turned on later), else at the first of onLayoutReady and the cache's first "resolved" (at a
  // start, Obsidian 1.12 left a plugin's layout-ready callback uncalled; the files' own "create"
  // events have put the notes in by then, only `ready` waits)
  let started = false;
  const start = async () => {
    if (started) return;
    started = true;
    const notes = (app.vault.getFolderByPath(TASKS)?.children ?? [])
      .filter(f => f.extension === "md");

    byPath.clear();
    try {
      for (const f of notes) byPath.set(f.path, parseNote(f.path, await app.vault.cachedRead(f)));
    } catch (e) {
      started = false;   // the next "resolved" reads again

      return console.error("winx: the tasks' notes weren't read", e);
    }

    taskStore.ready = true;
    refresh();
  };

  if (app.workspace.layoutReady) return void start();
  app.workspace.onLayoutReady(start);
  plugin.registerEvent(app.metadataCache.on("resolved", start));
}
