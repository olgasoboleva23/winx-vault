// The ledger's numbers, without markup (tested by tests/finance.test.mjs): a month note's rows, a month's totals, the
// Finance page's report. A row: { date, time, amount, category, description }; spending is negative.
import { amount as toAmount } from "../../core/format.js";

const TRANSFER = "Переводы";   // transfers move money between your own accounts or split bills: not spending or income

// a ledger note's pipe table (no Dataview fields), so a hand-added cash row works like an imported one
export function parseLedger(text) {
  const rows = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (!t.startsWith("|")) continue;
    const cells = t.slice(1, -1).split("|").map(c => c.trim());
    if (cells.length !== 5 || cells[0] === "date" || /^[-:\s]+$/.test(cells[0])) continue;
    const amount = toAmount(cells[2]);
    if (amount !== null) rows.push({ date: cells[0], time: cells[1], amount, category: cells[3], description: cells[4] });
  }
  return rows;
}

export function summarize(rows) {
  const totals = { spent: 0, income: 0, transfers: 0, categories: {} };
  for (const row of rows) {
    if (row.category === TRANSFER) totals.transfers += Math.abs(row.amount);
    else if (row.amount < 0) { totals.spent += -row.amount; totals.categories[row.category] = (totals.categories[row.category] ?? 0) + -row.amount; }
    else totals.income += row.amount;
  }
  return totals;
}

// a month of `ledger` ({ "YYYY-MM": rows }): its totals and net, categories biggest first, the spending of up to
// 6 months up to it (trend, peak: the highest, at least 1), its latest 8 operations without transfers
export function monthReport(ledger, months, current) {
  const rows = ledger[current] ?? [], totals = summarize(rows), index = months.indexOf(current);
  const trend = months.slice(Math.max(0, index - 5), index + 1).map(month => ({ month, spent: summarize(ledger[month]).spent }));
  return {
    totals, index, net: totals.income - totals.spent,
    categories: Object.entries(totals.categories).sort((a, b) => b[1] - a[1]),
    trend, peak: Math.max(...trend.map(t => t.spent), 1),
    latest: rows.filter(r => r.category !== TRANSFER).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 8),
  };
}
