// Finance: the per-month ledgers written by 00 System/Scripts/finance/import_statement.py — a month's totals,
// categories against their budgets, a 6-month trend and the latest operations; ◀ ▶ step through the months.
// The data (02 Areas/Finance) stays in the vault; styles in styles/widgets/_finance.scss (blocks winx-fin, winx-fin-month).
import { html } from "../core/html.js";
import { Widget } from "./widget.js";
import { dm } from "../core/dates.js";
import { NoteLink } from "../uikit/noteLink.js";
import { money } from "../core/format.js";
import { readJson } from "../core/files.js";

const LEDGER = "02 Areas/Finance/Ledger";
const RULES = "02 Areas/Finance/rules.json";
const TRANSFER = "Переводы";
const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// palette cycled across categories, in winx token order
const PALETTE = ["--winx-pink", "--winx-gold", "--winx-purple", "--winx-lavender", "--winx-blue", "--winx-pink-deep", "--winx-gold-deep", "--winx-purple-light"];

// transfers move money between your own accounts or split bills: kept in the ledger, not spending or income
function summarize(rows) {
  const totals = { spent: 0, income: 0, transfers: 0, categories: {} };
  for (const row of rows) {
    if (row.category === TRANSFER) totals.transfers += Math.abs(row.amount);
    else if (row.amount < 0) { totals.spent += -row.amount; totals.categories[row.category] = (totals.categories[row.category] ?? 0) + -row.amount; }
    else totals.income += row.amount;
  }
  return totals;
}

export class Finance extends Widget {
  current = null;   // the shown month, "YYYY-MM"
  on = {
    prev: () => { this.current = this.months[this.months.indexOf(this.current) - 1]; this.draw(); },
    next: () => { this.current = this.months[this.months.indexOf(this.current) + 1]; this.draw(); },
  };

  loadRules() { return readJson(RULES, { budgets: {} }); }
  // the pipe tables themselves (no Dataview fields), so a hand-added cash row works like an imported one
  async loadLedger() {
    const listing = await this.app.vault.adapter.list(LEDGER).catch(() => null);
    if (!listing) return {};
    const months = {};
    for (const file of listing.files.filter(f => f.endsWith(".md"))) {
      const rows = [];
      for (const line of (await this.app.vault.adapter.read(file)).split("\n")) {
        const text = line.trim();
        if (!text.startsWith("|")) continue;
        const cells = text.slice(1, -1).split("|").map(c => c.trim());
        if (cells.length !== 5 || cells[0] === "date" || /^[-:\s]+$/.test(cells[0])) continue;
        const amount = Number(cells[2]);
        if (Number.isFinite(amount)) rows.push({ date: cells[0], time: cells[1], amount, category: cells[3], description: cells[4] });
      }
      if (rows.length) months[file.slice(file.lastIndexOf("/") + 1, -3)] = rows;
    }
    return months;
  }

  async data() {
    const [ledger, rules] = await Promise.all([this.loadLedger(), this.loadRules()]);
    this.months = Object.keys(ledger).sort();
    if (!this.months.includes(this.current)) {
      const now = new Date(), thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      this.current = this.months.includes(thisMonth) ? thisMonth : this.months.at(-1);
    }
    return { ledger, budgets: rules.budgets ?? {}, months: this.months, current: this.current };
  }

  view({ ledger, budgets, months, current }) {
    if (!months.length) return html`<div class="winx-fin"><div class="winx-fin__empty">The ledger is empty. Export a statement from SberBank Online to 02 Areas/Finance/Statements and run 00 System/Scripts/finance/import.sh</div></div>`;
    const rows = ledger[current] ?? [], totals = summarize(rows), [year, month] = current.split("-");
    const index = months.indexOf(current), net = totals.income - totals.spent;
    const categories = Object.entries(totals.categories).sort((a, b) => b[1] - a[1]);
    const window6 = months.slice(Math.max(0, index - 5), index + 1);
    const spends = window6.map(m => summarize(ledger[m]).spent), peak = Math.max(...spends, 1);
    const latest = rows.filter(r => r.category !== TRANSFER).sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time)).slice(0, 8);
    const bar = (name, value, max, color, budget) => {
      const ratio = budget ? Math.min(value / budget, 1) : value / (max || 1);
      const fill = budget && value > budget ? "var(--winx-pink-deep)" : `var(${color})`;
      return html`<div class="winx-fin__row"><span>${name}</span>${budget
        ? html`<span class="winx-fin__amt${value > budget ? " winx-fin__amt--over" : ""}">${money(value)} / ${money(budget)} · ${Math.round(value / budget * 100)}%</span>`
        : html`<span class="winx-fin__amt">${money(value)}</span>`}<div class="winx-fin__track"><div class="winx-fin__fill" style="width: ${Math.max(ratio * 100, 1.5)}%; background: ${fill};"></div></div></div>`;
    };
    return html`<div class="winx-fin">
      <div class="winx-fin__head"><div class="winx-fin__title">${MONTHS[Number(month) - 1]} ${year}</div>
        <div class="winx-fin__nav"><button class="winx-fin__nav-btn"${index <= 0 ? html` disabled="true"` : html` data-action="prev"`}>◀</button><button class="winx-fin__nav-btn"${index >= months.length - 1 ? html` disabled="true"` : html` data-action="next"`}>▶</button></div></div>
      <div class="winx-fin__totals">${[["Spent", totals.spent, "neg"], ["Received", totals.income, "pos"], ["Net", net, net < 0 ? "neg" : "pos"]]
        .map(([label, value, sign]) => html`<div class="winx-fin__total winx-fin__total--${sign}"><span class="winx-fin__total-label">${label}</span><b class="winx-fin__total-value">${money(value)}</b></div>`)}</div>
      ${totals.transfers > 0 ? html`<div class="winx-fin__section">transfers ${money(totals.transfers)} — not counted as spending</div>` : ""}
      ${categories.length ? html`<div class="winx-fin__section">Categories</div><div class="winx-fin__rows">${categories.map(([name, value], i) => bar(name, value, categories[0][1], PALETTE[i % PALETTE.length], budgets[name]))}</div>` : ""}
      ${window6.length > 1 ? html`<div class="winx-fin__section">Spending by month</div><div class="winx-fin__trend">${window6.map((m, i) => html`<div class="winx-fin__bar${m === current ? " winx-fin__bar--current" : ""}"><div class="winx-fin__col" style="height: ${Math.max(spends[i] / peak * 100, 3)}%;" aria-label="${money(spends[i])}"></div><small class="winx-fin__bar-label">${MONTHS_SHORT[Number(m.split("-")[1]) - 1]}</small></div>`)}</div>` : ""}
      ${latest.length ? html`<div class="winx-fin__section">Recent transactions</div><div class="winx-fin__list">${latest.map(r => html`<div class="winx-fin__item"><span class="winx-fin__item-date">${dm(r.date)}</span><span class="winx-fin__item-text">${r.category} · ${r.description}</span><span class="winx-fin__item-sum">${money(r.amount)}</span></div>`)}</div>` : ""}
    </div>`;
  }
}

// The dashboard's Finance card: this month's spent and income on one line, the full Finance note a tap away.
export class FinanceMonth extends Finance {
  view({ ledger, months, current }) {
    const link = new NoteLink({ text: "💰 open finance", path: "Finance", kind: "text" });
    if (!months.length) return html`<div class="winx-fin-month">${link}</div>`;
    const { spent, income } = summarize(ledger[current]);
    return html`<div class="winx-fin-month"><div>${MONTHS[Number(current.split("-")[1]) - 1]}: spent <b class="winx-fin-month__sum">${money(spent)}</b> · income <b class="winx-fin-month__sum">${money(income)}</b></div>${link}</div>`;
  }
}
