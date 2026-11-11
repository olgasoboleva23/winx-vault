// XP: a task's by its difficulty, levels from total XP (pure, tested by tests/logic.test.mjs).

// XP value of a task, by its difficulty ("easy"…; 0 without one).
export const taskXp = (task, xpMap) => xpMap[task.difficulty] ?? 0;

// Level from total XP: level n costs base + (n-1)*step XP (config.levelCost); progress is what's
// left over.
export const levelInfo = (total, base, step) => {
  let left = total;

  for (let level = 1; ; level++) {
    const cost = base + (level - 1) * step;

    if (left < cost) return { level, progress: left, cost };
    left -= cost;
  }
};

// XP Today's legend (config.levels): each level's colour and its top XP, the last one "<the one
// before>+"
export const xpLegend = levels => levels.map(({ name, cls, max }, i) =>
  ({ name, cls, max: max === Infinity ? `${levels[i - 1].max}+` : max }));
