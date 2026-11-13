// The single Winx tab's state: the page shown and each page's own state. Obsidian saves it with
// the layout; `saved` is what goes in, `readState` makes a whole state of whatever comes back.

import { readState as readCalendar, SAVED as CALENDAR_SAVED } from "#/store/calendar.js";
import { readState as readProjects } from "#/store/projects.js";

export const PAGES = ["dashboard", "calendar", "projects", "finance", "shop", "supplies", "food"];

const DATE = /^\d{4}-\d{2}-\d{2}$/;

// a saved state as a whole one: an unknown page is the dashboard, broken fields get defaults
export function readState(saved) {
  const s = saved && typeof saved === "object" ? saved : {};
  const date = s.dashboard?.date;

  return {
    page: PAGES.includes(s.page) ? s.page : "dashboard",
    dashboard: { date: typeof date === "string" && DATE.test(date) ? date : null },
    calendar: readCalendar(s.calendar),
    projects: readProjects(s.projects),
  };
}

// a plain JSON copy for Obsidian's layout: the calendar keeps only its SAVED keys
export function saved(state) {
  const calendar = Object.fromEntries(CALENDAR_SAVED.map(k => [k, state.calendar[k]]));

  return JSON.parse(JSON.stringify({ ...state, calendar }));
}

// a deep copy on `page`, `params` merged into that page's state (when it has one)
export function withParams(state, page, params = {}) {
  const next = saved(state);

  next.page = page;
  if (next[page]) Object.assign(next[page], params);

  return next;
}

// does Obsidian get a back / forward entry? A page or an open project, not a week inside a page
export const isStep = (prev, next) =>
  prev.page !== next.page || prev.projects.open !== next.projects.open;
