// HP and MP (tested by tests/logic.test.mjs). HP, Habitica-style: of 50, every missed task (open, its day gone by)
// costs 2 a star of its difficulty, every task done today gives 1 a star back. MP: of 4, the strength the day of
// the cycle usually brings.
const HP_MAX = 50, MP_MAX = 4;
const stars = t => (t.difficulty ?? "").match(/⭐/gu)?.length ?? 0;
const sum = (list, f) => list.reduce((a, t) => a + f(t), 0);

export function vitals({ missed, doneToday }) {
  const damage = sum(missed, t => 2 * stars(t)), heal = sum(doneToday, stars);
  return { hp: Math.max(0, Math.min(HP_MAX, HP_MAX - damage + heal)), hpMax: HP_MAX, damage, heal };
}

// a cycle of `length` days with a `period`-day period, as MP phases { from, to (days of the cycle), value, phase }:
// ovulation 14 days before the next start, the 5 days before it and the day after count with it; a phase a short
// cycle leaves no days for is dropped
export function mpPhases(length, period) {
  const ov = length - 14, phases = [];
  let from = 1;
  for (const [to, value, phase] of [[period, 1, "period"], [ov - 6, 3, "follicular"], [ov + 1, 4, "ovulation"], [length - 5, 3, "luteal"], [length, 2, "pre-period"]]) {
    if (to >= from) phases.push({ from, to, value, phase });
    from = Math.max(from, to + 1);
  }
  return phases;
}

// MP on a day: `cycle` is CycleLog.on(day) ({ day, length, period, isPeriod }), null without Cycle.md. The period
// as logged wins over the usual one; past the cycle's length it's still before the period. up: the next rise
// this cycle ({ value, in: days }), null at the top
export function mana(cycle) {
  if (!cycle) return null;
  const { day, length, period, isPeriod } = cycle, phases = mpPhases(length, period);
  let i = phases.findIndex(p => day <= p.to);
  if (i < 0) i = phases.length - 1;
  let now = phases[i];
  if (isPeriod) now = phases[0];
  else if (now.phase === "period") now = phases[1] ?? now;
  const next = phases.slice(i + 1).find(p => p.value > now.value);
  return { value: now.value, max: MP_MAX, phase: now.phase, day, up: next ? { value: next.value, in: next.from - day } : null, phases };
}

// "MP 3/4 · follicular · ↑4 in 4 d", and the cycle's phases one a line (a tooltip)
export const mpLine = mp => `MP ${mp.value}/${mp.max} · ${mp.phase}${mp.up ? ` · ↑${mp.up.value} in ${mp.up.in} d` : ""}`;
export const mpTable = mp => mp.phases.map(p => `day ${p.from}–${p.to} · ${p.phase} · MP ${p.value}`).join("\n");


