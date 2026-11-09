// The tasks, read by the plugin itself and kept up to date: `tasks` (every task of Master.md, each
// with its record as `rec`, null when its id has none), `records` (tasks.json: Winx's part of every
// task, by id), `pool` (the records with pool: true, as { id, pool: true, rec, path }), `ready`
// (the first read is done), `version` (a Vue ref, bumped on every change: a computed that reads it
// is worked out again). useTaskStore(plugin) starts it once the vault is loaded; Master.md or
// tasks.json saved, made, deleted or renamed is read again on Obsidian's own event, at once
// (Dataview's index comes a second later, and only once it's built). The folder's other files
// (backups) are not read.
import { ref } from "vue";
import { app } from "#/helpers/app.js";
import { parseNote } from "#/models/taskFile.js";
import { Task } from "#/models/task.js";
import { MASTER, TASK_RECORDS } from "#/helpers/paths.js";

const byPath = new Map();   // path → its items

const refresh = () => {
  const recs = taskStore.records;
  const rec = i => recs.get(new Task(`- ${i.text}`).id) ?? null;

  taskStore.tasks = [...byPath.values()].flat().filter(i => i.status !== null)
    .map(i => ({ ...i, rec: rec(i) }));
  taskStore.pool = [...recs].filter(([, r]) => r.pool)
    .map(([id, r]) => ({ id, pool: true, rec: r, path: TASK_RECORDS }));
  taskStore.version.value++;
};

export const taskStore = {
  tasks: [], pool: [], records: new Map(), ready: false, version: ref(0),
  // the note's items set from its text (a test's, or a write the plugin just made)
  put(path, text) { byPath.set(path, parseNote(path, text)); refresh(); },
  // the records set from tasks.json's object
  putRecords(json) { taskStore.records = new Map(Object.entries(json)); refresh(); },
  drop(path) {
    reads.delete(path);
    if (path === TASK_RECORDS) taskStore.putRecords({});
    else if (byPath.delete(path)) refresh();
  },
};

const ours = path => path === MASTER || path === TASK_RECORDS;
const reads = new Map();   // path → its last read's number: an older read, or one of a note dropped
                           // since, is not put
// the note's text, or null when a newer read began or the note was dropped meanwhile
const fresh = async file => {
  const n = (reads.get(file.path) ?? 0) + 1;

  reads.set(file.path, n);
  const text = await app.vault.cachedRead(file);

  return reads.get(file.path) === n ? text : null;
};

// a file's text into the store: tasks.json as records (one that isn't JSON leaves them as they
// were), Master.md as its items
const take = (path, text) => {
  if (path !== TASK_RECORDS) return taskStore.put(path, text);
  try {
    taskStore.putRecords(JSON.parse(text));
  } catch (e) {
    console.error("winx: tasks.json isn't JSON, the records stay as they were", e);
  }
};

const read = async file => {
  const text = await fresh(file);

  if (text !== null) take(file.path, text);
};

export function useTaskStore(plugin) {
  const changed = f => { if (ours(f.path)) void read(f); };

  plugin.registerEvent(app.vault.on("modify", changed));
  plugin.registerEvent(app.vault.on("create", changed));
  plugin.registerEvent(app.vault.on("delete", f => ours(f.path) && taskStore.drop(f.path)));
  plugin.registerEvent(app.vault.on("rename", (f, old) => {
    if (ours(old)) taskStore.drop(old);
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
    const files = [MASTER, TASK_RECORDS].map(p => app.vault.getFileByPath(p)).filter(Boolean);

    byPath.clear();
    try {
      for (const f of files) {
        const text = await fresh(f);   // the same guard as a change's read

        if (text !== null) take(f.path, text);
      }
    } catch (e) {
      started = false;   // the next "resolved" reads again

      return console.error("winx: the tasks' notes weren't read", e);
    }

    taskStore.ready = true;
    refresh();
  };

  // "resolved" first: a first read that fails is tried again then, the plugin turned on late too
  plugin.registerEvent(app.metadataCache.on("resolved", start));
  if (app.workspace.layoutReady) void start();
  else app.workspace.onLayoutReady(start);
}
