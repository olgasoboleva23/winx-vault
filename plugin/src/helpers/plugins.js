// The other plugins' APIs winx uses (undefined while one is off)
import { app } from "./app.js";

export const dataview = () => app.plugins.plugins.dataview?.api;

export const tasksApi = () => app.plugins.plugins["obsidian-tasks-plugin"]?.apiV1;

// Dataview for a block in `sourcePath`, drawn in `el`: pages / page from that note, and current():
// the note with the date of the tab it's drawn in (the dashboard's data-date) over the note's; null
// while Dataview is off
export function blockDv(sourcePath, el) {
  const api = dataview();

  return api && {
    pages: q => api.pages(q, sourcePath),
    page: p => api.page(p, sourcePath),
    current: () => {
      const page = api.page(sourcePath), date = el.closest("[data-date]")?.dataset.date;

      return date ? { ...page, date: api.date(date) } : page;
    },
    date: d => api.date(d),
    api,
  };
}
