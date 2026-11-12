// The tasks, read by the plugin itself and kept up to date: `tasks` (every task of Master.md, each
// with its record as `rec`, null when its id has none), `records` (tasks.json: Winx's part of every
// task, by id), `pool` (the records with pool: true, as { id, pool: true, rec, path }), `projects`
// (projects.json by id, in file order; `records` and `projects` are the two collections'
// loaded copies, helpers/collection.js), `inProject` (the ids on any project's stages), `ready`
// (the first read is done), `version` (a Vue ref, bumped on every change: a computed that reads it
// is worked out again). stageTasks(stage) gives a stage's tasks with their state.
// useTaskStore(plugin) starts it once the vault is loaded; Master.md, tasks.json, projects.json
// or config.json (the ⚙ Settings: XP, gold, areas, put into helpers/config.js) saved, made,
// deleted or renamed is read again on Obsidian's own event, at once (Dataview's index comes a
// second later, and only once it's built), so everything drawn from the tasks draws again. The
// folder's other files (backups) are not read.
import { ref } from "vue";
import { app } from "#/helpers/app.js";
import { parseNote } from "#/models/taskFile.js";
import { Task } from "#/models/task.js";
import { collection } from "#/helpers/collection.js";
import { applyConfig } from "#/helpers/config.js";
import { CONFIG, MASTER, PROJECTS, TASK_RECORDS } from "#/helpers/paths.js";

let items = [];   // Master.md's items

export const records = collection(TASK_RECORDS), projects = collection(PROJECTS);
const JSONS = [records, projects];

const refresh = () => {
  const recs = records.records;
  const rec = i => recs.get(new Task(`- ${i.text}`).id) ?? null;

  taskStore.tasks = items.filter(i => i.status !== null)
    .map(i => ({ ...i, rec: rec(i) }));
  taskStore.pool = [...recs].filter(([, r]) => r.pool)
    .map(([id, r]) => ({ id, pool: true, rec: r, path: TASK_RECORDS }));
  taskStore.inProject = new Set([...projects.records.values()]
    .flatMap(p => (p.stages ?? []).flatMap(s => s.tasks ?? [])));
  taskStore.version.value++;
};

export const taskStore = {
  tasks: [], pool: [], inProject: new Set(), ready: false, version: ref(0),
  get records() { return records.records; },
  get projects() { return projects.records; },
  // the note's items set from its text (a test's, or a write the plugin just made)
  put(path, text) { items = parseNote(path, text); refresh(); },
  // the records set from tasks.json's object
  putRecords(json) { records.load(json); refresh(); },
  // the projects set from projects.json's object
  putProjects(json) { projects.load(json); refresh(); },
  drop(path) {
    reads.delete(path);
    const c = JSONS.find(j => j.path === path);

    if (c) { c.load({}); refresh(); }
    else if (path === CONFIG) { applyConfig(); refresh(); }
    else { items = []; refresh(); }
  },
};

const ours = path => path === MASTER || path === TASK_RECORDS || path === PROJECTS
  || path === CONFIG;

// a stage's tasks, each once: its open line, else its done line (a skipped-only or unknown id is
// left out), as { id, t, done }, in the stage's order
export function stageTasks(stage) {
  const lines = new Map();

  for (const t of taskStore.tasks) {
    const task = Task.of(t), id = task.id;

    if (!id || !(task.isOpen || task.isDone)) continue;
    if (!lines.has(id) || (task.isOpen && lines.get(id).done)) {
      lines.set(id, { id, t, done: task.isDone });
    }
  }

  return [...new Set(stage.tasks ?? [])].map(id => lines.get(id)).filter(Boolean);
}

const reads = new Map();   // path → its last read's number: an older read, or one of a note dropped
                           // since, is not put
let lastRead = 0;          // one count for every read, never reused (a note made again starts no
                           // new count that an old read's number could match)
// the note's text, or null when a newer read began or the note was dropped meanwhile
const fresh = async file => {
  const n = ++lastRead;

  reads.set(file.path, n);
  const text = await app.vault.cachedRead(file);

  return reads.get(file.path) === n ? text : null;
};

// a file's text into the store: tasks.json as records, config.json as the settings over the
// defaults (a file that isn't JSON leaves them as they were), Master.md as its items
const take = (path, text) => {
  if (path === MASTER) return taskStore.put(path, text);
  try {
    const c = JSONS.find(j => j.path === path);

    if (c) c.load(JSON.parse(text));
    else applyConfig(JSON.parse(text));
    refresh();
  } catch (e) {
    console.error(`winx: ${path} isn't JSON, it's left as it was`, e);
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
    const files = [MASTER, TASK_RECORDS, PROJECTS, CONFIG].map(p => app.vault.getFileByPath(p))
      .filter(Boolean);

    items = [];
    try {
      for (const f of files) await read(f);   // the same guard as a change's read
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
