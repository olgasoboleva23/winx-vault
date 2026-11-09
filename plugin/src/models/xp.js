// XP: a task's by its difficulty, levels from total XP (pure, tested by tests/logic.test.mjs).

// XP value of a task, by its difficulty ("easy"…; 0 without one).
export const taskXp = (task, xpMap) => xpMap[task.difficulty] ?? 0;

// Level from total XP: level n costs base + (n-1)*step XP; progress is what's left over.
export const levelInfo = (total, base = 100, step = 25) => {
  let left = total;

  for (let level = 1; ; level++) {
    const cost = base + (level - 1) * step;

    if (left < cost) return { level, progress: left, cost };
    left -= cost;
  }
};
