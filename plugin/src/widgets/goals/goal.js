// Goals.md items and how a week of them went; today's reminders (tested by tests/entities.test.mjs).
import { weekday } from "../../core/dates.js";

const DAY_NAMES = ["пн", "вт", "ср", "чт", "пт", "сб", "вс"];
const DAY_NAMES_EN = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

// A goal of Goals.md (Shop.md format: "name:: …" plus continuation lines): its name, tag (the tasks that count),
// planned weekdays (days, ISO 1–7) or a number per week, the minimum version, a plan and a reminder time.
export class Goal {
  static parse(text) {
    const field = k => text.match(new RegExp(`(?:^|\\s)${k}::[ \\t]*(.*)`, "m"))?.[1].trim() || null;
    const name = field("name"), tag = field("tag");
    if (!name || !tag) return null;
    const daysRaw = field("days");
    const days = daysRaw
      ? daysRaw.toLowerCase().split(/[,\s]+/).map(d => (DAY_NAMES.indexOf(d) + 1) || (DAY_NAMES_EN.indexOf(d.slice(0, 3)) + 1)).filter(Boolean)
      : null;
    return Object.assign(new Goal(), { name, tag, days, perWeek: days ? null : Number(field("perWeek")) || null, min: field("min"), plan: field("plan"), remind: field("remind") ?? "18:00" });
  }
  get weeklyTarget() { return this.days?.length ?? this.perWeek ?? 0; }
  // how many days of `week` have a done task (doneDates: its ✅ dates)
  doneIn(doneDates, week) { return new Set(doneDates.filter(d => week.includes(d))).size; }
  // done | missed (a planned day gone by) | planned | none
  statusOn(date, doneSet, today) {
    if (doneSet.has(date)) return "done";
    if (this.days?.includes(weekday(date))) return date < today ? "missed" : "planned";
    return "none";
  }
}

// Today's notifications from open tasks due today. A goal task fires at the
// goal's remind time with its plan; a task with "HH:MM" in its text fires
// 30 minutes before. Sorted by time.
export const reminders = function (tasks, goals) {
  const out = [];
  for (const t of tasks) {
    const goal = goals.find(g => t.tags.includes(g.tag));
    if (goal) { out.push({ at: goal.remind, title: goal.name, body: goal.plan || goal.min || goal.name }); continue; }
    const m = t.text.match(/(?:^|\s)(\d{1,2}):(\d{2})(?!\d)/);
    if (!m) continue;
    const mins = Math.max(0, Number(m[1]) * 60 + Number(m[2]) - 30);
    const at = `${String(Math.floor(mins / 60)).padStart(2, "0")}:${String(mins % 60).padStart(2, "0")}`;
    out.push({ at, title: "In 30 minutes", body: t.text.replace(/#[^\s]+/g, "").trim() });
  }
  return out.sort((a, b) => a.at.localeCompare(b.at));
};
