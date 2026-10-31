// The cycle: its day on a date, the next start forecast, whether it's a period day (tested by tests/entities.test.mjs).
import { addDays, diffDays } from "../../core/dates.js";

// The log of Cycle.md: the start dates, the recorded last days of a period (ends) and the usual period length.
// on(date): the day of the cycle, its usual length, the next start and how far, a period day or not, ended or not
// (null before the first start). The end of a cycle is the first end between its start and the next start;
// without one, the period lasts the average of the last 6 recorded lengths, or `period` days if none.
export class CycleLog {
  constructor(starts, ends = [], period = 8) { this.starts = starts; this.ends = ends; this.period = period; }
  on(date) {
    const { starts, ends, period } = this;
  const all  = [...starts].sort();
  const past = all.filter(s => s <= date);
  if (!past.length) return null;
  const endOf = (s, i) => ends.filter(e => e >= s && (all[i + 1] === undefined || e < all[i + 1])).sort()[0];
  const recent = past.slice(-7);
  const gaps = recent.slice(1).map((s, i) => diffDays(s, recent[i]));
  const length = gaps.length ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : 30;
  const lens = all.map((s, i) => [s, endOf(s, i)]).filter(([s, e]) => e && s < past.at(-1))
    .slice(-6).map(([s, e]) => diffDays(e, s) + 1);
  const usual = lens.length ? Math.round(lens.reduce((a, b) => a + b, 0) / lens.length) : period;
  const last = past.at(-1);
  const end  = endOf(last, all.indexOf(last));
  const day  = diffDays(date, last) + 1;
  const nextStart = addDays(last, length);
  return {
    day, length, nextStart, daysUntil: diffDays(nextStart, date),
    isPeriod: end ? date <= end : day <= usual,
    ended: !!end && end <= date,
  };
  }
  // the last n finished cycles, oldest first: { start, length (days to the next start), period (days, null without an end) }
  last(n) {
    const all = [...this.starts].sort();
    return all.slice(0, -1).map((start, i) => {
      const end = this.ends.filter(e => e >= start && e < all[i + 1]).sort()[0];
      return { start, length: diffDays(all[i + 1], start), period: end ? diffDays(end, start) + 1 : null };
    }).slice(-n);
  }
  // the current cycle up to `today`, then the finished ones, newest first, n in all: { start, end (its last day),
  // days, period (days, null without an end), ovulation (the day of the cycle, 14 days before its end; null for the
  // current one), current }
  recent(n, today) {
    const all = [...this.starts].filter(s => s <= today).sort();
    if (!all.length) return [];
    const last = all.at(-1), end = this.ends.filter(e => e >= last && e <= today).sort()[0];
    const current = { start: last, end: today, days: diffDays(today, last) + 1, period: end ? diffDays(end, last) + 1 : null, ovulation: null, current: true };
    const done = this.last(n - 1).reverse().map(c => ({ start: c.start, end: addDays(c.start, c.length - 1), days: c.length, period: c.period, ovulation: c.length - 14, current: false }));
    return [current, ...done];
  }
}
