// HP and MP (tested by tests/logic.test.mjs). HP, Habitica-style: of 50, every missed task (open, its day gone by)
// costs 2 a star of its difficulty, every task done today gives 1 a star back. MP: today's pomodoro focus sessions
// out of 4.
const HP_MAX = 50, MP_MAX = 4;
const stars = t => (t.difficulty ?? "").match(/⭐/gu)?.length ?? 0;
const sum = (list, f) => list.reduce((a, t) => a + f(t), 0);

export function vitals({ missed, doneToday, focus }) {
  const damage = sum(missed, t => 2 * stars(t)), heal = sum(doneToday, stars);
  return { hp: Math.max(0, Math.min(HP_MAX, HP_MAX - damage + heal)), hpMax: HP_MAX, damage, heal, mp: Math.min(focus, MP_MAX), mpMax: MP_MAX };
}
