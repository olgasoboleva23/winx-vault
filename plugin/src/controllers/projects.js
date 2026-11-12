// The writes of projects.json (a project by key p1, p2…): one write each (the projects collection),
// so two writes never lose each other. A stage found changed meanwhile (another device) writes
// nothing.
import { Notice } from "obsidian";
import { MEDIA } from "#/helpers/paths.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { Search } from "#/components/uikit/Search/index.ts";
import { PROJECTS_VIEW } from "#/store/projects.js";
import { projects } from "#/store/tasks.js";
import { Task } from "#/models/task.js";
import { editTaskLine, newTask } from "#/controllers/tasks.js";

export const createProject = ({ name, description = "", status = "active", cover = null }) =>
  projects.add({ name, status, description, result: "", notes: "", cover, stages: [] }, "p");

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
export const saveProject = (key, patch) => projects.update(key, p => ({ ...p, ...patch }));

export const addStage = (key, name) => projects.update(key, p =>
  ({ ...p, stages: [...p.stages ?? [], { name, tasks: [] }] }));

// a new task (`ask`: the New task flow) on a stage: found by index and name, so a stage that moved
// meanwhile is not written to. null when cancelled or changed.
export async function addToStage(key, index, stageName, ask = newTask) {
  const id = await ask();

  if (!id) return null;
  const saved = await projects.update(key, p => {
    const stage = p.stages?.[index];

    if (stage?.name !== stageName) {
      new Notice("✦ project changed, try again");
      return null;
    }

    return {
      ...p,
      stages: p.stages.map((st, i) => i !== index || st.tasks.includes(id) ? st
        : { ...st, tasks: [...st.tasks, id] }),
    };
  });

  return saved ? id : null;
}

// a task on a calendar day
export const toCalendar = (t, date) => editTaskLine(t, l => new Task(l).setDue(date));
