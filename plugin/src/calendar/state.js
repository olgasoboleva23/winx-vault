import { monthGrid, weekOf } from "../core/dates.js";
// The calendar tab's state: what Obsidian saves with the workspace layout and gives back after a restart.
// `date` null = follow today (the week or month of today, moving on by itself); a date = the one picked.

export const DEFAULT = Object.freeze({ date: null, view: "week", showDone: false, tab: "nodate", unfolded: [], backlogOpen: false, bdaysOpen: false });

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const pick = (v, ok, fallback) => (ok(v) ? v : fallback);
const bool = v => typeof v === "boolean";

// a saved state as a whole one: unknown or broken fields get their defaults
export function readState(saved) {
  const s = saved && typeof saved === "object" ? saved : {};
  return {
    date: pick(s.date, v => typeof v === "string" && DATE.test(v), null),
    view: pick(s.view, v => v === "week" || v === "month", "week"),
    showDone: pick(s.showDone, bool, false),
    tab: pick(s.tab, v => ["nodate", "regulars", "pool"].includes(v), "nodate"),
    unfolded: Array.isArray(s.unfolded) ? [...new Set(s.unfolded.filter(d => typeof d === "string" && DATE.test(d)))] : [],
    backlogOpen: pick(s.backlogOpen, bool, false),
    bdaysOpen: pick(s.bdaysOpen, bool, false),
  };
}

export const baseDate  = (state, today) => state.date ?? today;
export const shownDays = (state, today) => state.view === "month" ? monthGrid(baseDate(state, today)) : weekOf(baseDate(state, today));
// the state's date for a picked one: null (follow today) when it falls in today's week (week view) or month
export const dateFor = (date, view, today) => !date || (view === "month"
  ? date.slice(0, 7) === today.slice(0, 7)
  : weekOf(date)[0] === weekOf(today)[0]) ? null : date;
