// A savings jar: one note per goal with "- YYYY-MM-DD 12000" deposit lines; per_payday and price (optional) are the
// note's properties. Paydays: the 16th and the 30th (a short month's last day), a Saturday or Sunday one on the Friday
// before (tested by tests/entities.test.mjs).
import { addDays, addMonths, weekday } from "../../core/dates.js";

const DEPOSIT = /^- (\d{4}-\d{2}-\d{2}) (\d[\d\s]*)$/;

// the paydays from `from` to `to`, both "YYYY-MM-DD"
export function paydays(from, to) {
  const out = [];
  for (let month = from.slice(0, 8) + "01"; month <= to; month = addMonths(month, 1)) {
    const last = addDays(addMonths(month, 1), -1), thirtieth = month.slice(0, 8) + "30";
    for (const d of [month.slice(0, 8) + "16", last < thirtieth ? last : thirtieth]) {
      const day = addDays(d, -Math.max(0, weekday(d) - 5));
      if (day >= from && day <= to) out.push(day);
    }
  }
  return out;
}

export class SavingsJar {
  constructor(text, { per_payday = null, price = null } = {}) { this.text = text; this.perPayday = per_payday; this.price = price; }
  // { date, sum } in the note's order
  get deposits() {
    return this.text.split("\n").map(l => l.trim().match(DEPOSIT)).filter(Boolean).map(m => ({ date: m[1], sum: Number(m[2].replace(/\s/g, "")) }));
  }
  get saved() { return this.deposits.reduce((a, d) => a + d.sum, 0); }
  get pct()   { return this.price ? Math.round(this.saved / this.price * 100) : null; }
  get left()  { return this.price ? Math.max(0, this.price - this.saved) : null; }
  // the last payday up to today while its deposit isn't in (none dated on or after it): { payday, sum }; else null
  due(today) {
    const payday = paydays(addDays(today, -31), today).at(-1);
    return payday && !this.deposits.some(d => d.date >= payday) ? { payday, sum: this.perPayday } : null;
  }
  next(today, n) { return paydays(addDays(today, 1), addDays(today, 62)).slice(0, n); }
  // the note's text with a deposit added at the end
  deposit(date, sum = this.perPayday) { return `${this.text.trimEnd()}\n- ${date} ${sum}\n`; }
}
