// The writes of projects.json (a project by key p1, p2…): one editJson per write, so two writes
// never lose each other. A stage found changed meanwhile (another device) writes nothing.
import { Notice } from "obsidian";
import { editJson } from "#/helpers/files.js";
import { MEDIA, PROJECTS } from "#/helpers/paths.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { Search } from "#/components/uikit/Search/index.ts";
import { PROJECTS_VIEW } from "#/store/projects.js";
import { Task } from "#/models/task.js";
import { editTaskLine, newTask } from "#/controllers/tasks.js";

// the next free key: the biggest one plus one
const nextKey = all => `p${Math.max(0, ...Object.keys(all).map(k => +k.slice(1))) + 1}`;

export async function createProject({ name, description = "", status = "active", cover = null }) {
  let key;

  await editJson(PROJECTS, all => {
    key = nextKey(all);
    return {
      ...all, [key]: { name, status, description, result: "", notes: "", cover, stages: [] },
    };
  });
  return key;
}

// a picture of 03 Resources/Media by a search window: its path, null when closed
const pickCover = app => {
  const images = app.vault.getFiles().filter(f =>
    f.path.startsWith(`${MEDIA}/`) && /\.(webp|png|jpe?g|gif|avif)$/i.test(f.path));

  return Search.pick(
    app, "A cover picture…",
    q => images.filter(f => f.name.toLowerCase().includes(q.trim().toLowerCase())).slice(0, 50),
    (f, el) => void el.createDiv({ text: f.name }),
  ).then(f => f?.path ?? null);
};

const STATUSES = ["idea", "active", "paused", "done"];

// ✦ New project: its window (the cover: a tick that opens the picture search), saved, then the
// Projects tab on it. The new key, null when closed.
export async function askNewProject(
  app, ask = (...a) => Form.ask(...a), pick = pickCover,
) {
  const v = await ask(app, "✦ New project", [
    { name: "Name", key: "name", text: "what it is" },
    { name: "Description", key: "description", text: "a line about it", lines: true },
    {
      name: "Status", key: "status",
      options: STATUSES.map(s => ({ label: `${s[0].toUpperCase()}${s.slice(1)}`, value: s })),
    },
    { name: "Cover", key: "cover", check: "pick a picture" },
  ], { values: { status: "active" }, required: ["name"], submit: "Create" });

  if (!v) return null;
  const key = await createProject({
    name: v.name.trim(), description: v.description ?? "", status: v.status,
    cover: v.cover ? await pick(app) : null,
  });
  const { workspace } = app;
  const leaf = workspace.getLeavesOfType(PROJECTS_VIEW)[0] ?? workspace.getLeaf("tab");

  await leaf.setViewState({ type: PROJECTS_VIEW, active: true, state: { open: key } });
  void workspace.revealLeaf(leaf);
  return key;
}

// merge fields (name, status, description, result, notes, cover) into a project
export const saveProject = (key, patch) => editJson(PROJECTS, all =>
  all[key] ? { ...all, [key]: { ...all[key], ...patch } } : null);

export const addStage = (key, name) => editJson(PROJECTS, all => {
  const project = all[key];

  if (!project) return null;

  return { ...all, [key]: { ...project, stages: [...project.stages ?? [], { name, tasks: [] }] } };
});

// a new task (`ask`: the New task flow) on a stage: found by index and name, so a stage that moved
// meanwhile is not written to. null when cancelled or changed.
export async function addToStage(key, index, stageName, ask = newTask) {
  const id = await ask();

  if (!id) return null;
  let saved = false;

  await editJson(PROJECTS, all => {
    const stage = all[key]?.stages?.[index];

    if (stage?.name !== stageName) {
      new Notice("✦ project changed, try again");
      return null;
    }

    saved = true;
    if (!stage.tasks.includes(id)) stage.tasks.push(id);
    return all;
  });
  return saved ? id : null;
}

// a task on a calendar day
export const toCalendar = (t, date) => editTaskLine(t, l => new Task(l).setDue(date));
