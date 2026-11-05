// XP: a task's by its difficulty tag, levels from total XP (pure, tested by tests/logic.test.mjs).

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
