// The finance controller: the per-month ledger notes (one per month, in helpers/paths.js LEDGER) —
// a month's totals, categories against their budgets, a 6-month trend and the latest operations;
// ◀ ▶ step through the months. The data (00 System/Data/Finance) stays in the vault. The markup:
// widgets/finance/FinanceMonths (the Finance page; its styles also hold the dashboard card's
// winx-fin-month block), widgets/finance/FinanceLine/index.vue (the dashboard's card).
import { dm } from "#/helpers/dates.js";
import { money } from "#/helpers/format.js";
import { readJson } from "#/helpers/files.js";
import { LEDGER, RULES } from "#/helpers/paths.js";
import { monthReport, parseLedger, summarize } from "#/models/ledger.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August",
  "September", "October", "November", "December"];
const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "may", "jun",
  "jul", "aug", "sep", "oct", "nov", "dec"];
// palette cycled across categories, in winx token order
const PALETTE = ["--winx-pink", "--winx-gold", "--winx-purple", "--winx-lavender", "--winx-blue",
  "--winx-pink-deep", "--winx-gold-deep", "--winx-purple-light"];

// the pipe tables themselves (no Dataview fields): a cash row added by hand counts like an
// imported one
async function readLedger(app) {
  const listing = await app.vault.adapter.list(LEDGER).catch(() => null);

  if (!listing) return {};
  const months = {};

  for (const file of listing.files.filter(f => f.endsWith(".md"))) {
    const rows = parseLedger(await app.vault.adapter.read(file));

    if (rows.length) months[file.slice(file.lastIndexOf("/") + 1, -3)] = rows;
  }

  return months;
}

// the ledger, the budgets, its months in order and the one to start on: this month, else the
// latest
async function ledgerState(app) {
  const [ledger, rules] = await Promise.all([readLedger(app), readJson(RULES, { budgets: {} })]);
  const months = Object.keys(ledger).sort();
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = months.includes(thisMonth) ? thisMonth : months.at(-1);

  return { ledger, budgets: rules.budgets ?? {}, months, start };
}

// one month as the page shows it
function shownMonth(ledger, budgets, months, current) {
  const report = monthReport(ledger, months, current);
  const { totals, index, net, categories, trend, peak, latest } = report;
  const [year, month] = current.split("-");

  return {
    title: `${MONTHS[Number(month) - 1]} ${year}`,
    prev: index > 0 ? months[index - 1] : null,
    next: index < months.length - 1 ? months[index + 1] : null,
    totals: [
      { label: "Spent", value: money(totals.spent), sign: "neg" },
      { label: "Received", value: money(totals.income), sign: "pos" },
      { label: "Net", value: money(net), sign: net < 0 ? "neg" : "pos" },
    ],
    transfers: totals.transfers > 0 ? money(totals.transfers) : null,
    categories: categories.map(([name, value], i) =>
      category(name, value, categories[0][1], PALETTE[i % PALETTE.length], budgets[name])),
    // a month's bar: % of the biggest
    trend: trend.length < 2 ? [] : trend.map(({ month: m, spent }) => ({
      month: m, current: m === current, height: Math.max(spent / peak * 100, 3), sum: money(spent),
      label: MONTHS_SHORT[Number(m.split("-")[1]) - 1],
    })),
    latest: latest.map((r, i) => ({
      key: i, date: dm(r.date), text: `${r.category} · ${r.description}`, sum: money(r.amount),
    })),
  };
}

// every month, ready to show: ◀ ▶ switch between them in the view, no reading again
export async function loadFinance({ app }) {
  const { ledger, budgets, months, start } = await ledgerState(app);

  if (!months.length) return { empty: true, path: LEDGER };
  const byMonth = Object.fromEntries(months.map(m => [m, shownMonth(ledger, budgets, months, m)]));

  return { start, byMonth };
}

// a category's bar: against its budget (over it in pink, "spent / budget · %"), else against the
// biggest category
function category(name, value, max, color, budget) {
  const over = !!budget && value > budget;

  return {
    name, over,
    amount: budget
      ? `${money(value)} / ${money(budget)} · ${Math.round(value / budget * 100)}%`
      : money(value),
    width: Math.max((budget ? Math.min(value / budget, 1) : value / (max || 1)) * 100, 1.5),
    fill: over ? "var(--winx-pink-deep)" : `var(${color})`,
  };
}

// The dashboard's Finance card: this month's (else the latest's) spent and income on one line
export async function loadFinanceLine({ app }) {
  const { ledger, months, start } = await ledgerState(app);

  if (!months.length) return { empty: true };
  const { spent, income } = summarize(ledger[start]);

  return {
    month: MONTHS[Number(start.split("-")[1]) - 1],
    spent: money(spent),
    income: money(income),
  };
}
