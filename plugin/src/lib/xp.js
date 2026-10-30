// XP: a task's by its difficulty tag, levels from total XP (pure, tested by tests/lib.test.mjs), habit days.
import { ymd } from "./dates.js";

// XP value of a task, based on its difficulty tag (0 if untagged).
export const taskXp = (task, xpMap) =>
  Object.entries(xpMap).find(([tag]) => task.tags.includes(tag))?.[1] ?? 0;

// Level from total XP: level n costs base + (n-1)*step XP; progress is what's left over.
export const levelInfo = (total, base = 100, step = 25) => {
  let left = total;
  for (let level = 1; ; level++) {
    const cost = base + (level - 1) * step;
    if (left < cost) return { level, progress: left, cost };
    left -= cost;
  }
};

// Single pass over daily notes in [start, end]:
// { habitName: { area: "#area/x", days: Set<"yyyy-MM-dd"> } }
// Tag shape is #habit/area/name, or #habit/name (area doubles as name).
export function collectHabitDays(dv, start, end) {
  const habits = {};
  for (const page of dv.pages('"02 Areas/Personal/Daily Notes"')
      .where(p => p.date?.ts >= start.ts && p.date?.ts <= end.ts)) {
    const dateStr = ymd(page.date);
    for (const t of page.file.tasks) {
      const habitTag = t.tags?.find(tag => tag.startsWith("#habit/"));
      if (!habitTag || !t.completed) continue;
      const [, areaSlug, habitPart] = habitTag.split("/");
      const name = habitPart ?? areaSlug;
      (habits[name] ??= { area: `#area/${areaSlug}`, days: new Set() }).days.add(dateStr);
    }
  }
  return habits;
}
