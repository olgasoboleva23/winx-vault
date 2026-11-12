// The Projects tab's state: what Obsidian saves with the workspace layout and gives back after a
// restart. `open` null = the list; a project's key = its page. `filter`: the list's status tab.

export const PROJECTS_VIEW = "winx-projects";

export const DEFAULT = Object.freeze({ open: null, filter: "all" });

export const FILTERS = ["all", "idea", "active", "paused", "done"];

// what's saved with the layout
export const SAVED = Object.keys(DEFAULT);

// a saved state as a whole one: unknown or broken fields get their defaults
export function readState(saved) {
  const s = saved && typeof saved === "object" ? saved : {};

  return {
    open: typeof s.open === "string" ? s.open : null,
    filter: FILTERS.includes(s.filter) ? s.filter : "all",
  };
}
