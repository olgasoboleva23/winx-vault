// The writes of projects.json (a project by key p1, p2…): one editJson per write, so two writes
// never lose each other. A stage found changed meanwhile (another device) writes nothing.
import { Notice } from "obsidian";
import { editJson } from "#/helpers/files.js";
import { PROJECTS } from "#/helpers/paths.js";
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

// merge fields (name, status, description, result, notes, cover) into a project
export const saveProject = (key, patch) =>
  editJson(PROJECTS, all => ({ ...all, [key]: { ...all[key], ...patch } }));

export const addStage = (key, name) => editJson(PROJECTS, all => {
  const project = all[key];

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
