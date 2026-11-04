// Finance: the per-month ledger notes (one per month, in core/paths.js LEDGER) — a month's totals,
// categories against their budgets, a 6-month trend and the latest operations; ◀ ▶ step through the months.
// The data (00 System/Data/Finance) stays in the vault; styles in styles/widgets/_finance.scss
// (blocks winx-fin, winx-fin-month).
import { bem, html } from "../../core/html.js";
import { Widget } from "../widget.js";
import { dm } from "../../core/dates.js";
import { NoteLink } from "../../uikit/noteLink.js";
import { money } from "../../core/format.js";
import { readJson } from "../../core/files.js";
import { LEDGER, RULES } from "../../core/paths.js";
import { monthReport, parseLedger, summarize } from "./ledger.js";

const MONTHS = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October",
  "November", "December"];
const MONTHS_SHORT = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];
// palette cycled across categories, in winx token order
const PALETTE = ["--winx-pink", "--winx-gold", "--winx-purple", "--winx-lavender", "--winx-blue", "--winx-pink-deep",
  "--winx-gold-deep", "--winx-purple-light"];

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
      const rows = parseLedger(await this.app.vault.adapter.read(file));
      if (rows.length) months[file.slice(file.lastIndexOf("/") + 1, -3)] = rows;
    }
    return months;
  }

  // the ledger, the budgets and the shown month (this month, else the latest)
  async ledgerState() {
    const [ledger, rules] = await Promise.all([this.loadLedger(), this.loadRules()]);
    this.months = Object.keys(ledger).sort();
    if (!this.months.includes(this.current)) {
      const now = new Date(), thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
      this.current = this.months.includes(thisMonth) ? thisMonth : this.months.at(-1);
    }
    return { ledger, budgets: rules.budgets ?? {}, months: this.months, current: this.current };
  }

  async data() {
    const { ledger, budgets, months, current } = await this.ledgerState();
    if (!months.length) return { empty: true };
    const report = monthReport(ledger, months, current);
    const { totals, index, net, categories, trend, peak, latest } = report;
    const [year, month] = current.split("-");
    return {
      title: `${MONTHS[Number(month) - 1]} ${year}`,
      prev: index > 0, next: index < months.length - 1,
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
        current: m === current, height: Math.max(spent / peak * 100, 3), sum: money(spent),
        label: MONTHS_SHORT[Number(m.split("-")[1]) - 1],
      })),
      latest: latest.map(r => ({
        date: dm(r.date), text: `${r.category} · ${r.description}`, sum: money(r.amount),
      })),
    };
  }

  // ◀ ▶: a step to a month there is, else disabled
  step(on, action) { return on ? html` data-action="${action}"` : html` disabled="true"`; }
  bar(c) {
    return html`<div class="winx-fin__row">
      <span>${c.name}</span>
      <span class="${bem("winx-fin__amt", { over: c.over })}">${c.amount}</span>
      <div class="winx-fin__track">
        <div class="winx-fin__fill" style="width: ${c.width}%; background: ${c.fill};"></div>
      </div>
    </div>`;
  }
  total(t) {
    return html`<div class="winx-fin__total winx-fin__total--${t.sign}">
      <span class="winx-fin__total-label">${t.label}</span>
      <b class="winx-fin__total-value">${t.value}</b>
    </div>`;
  }
  month(m) {
    return html`<div class="${bem("winx-fin__bar", { current: m.current })}">
      <div class="winx-fin__col" style="height: ${m.height}%;" aria-label="${m.sum}"></div>
      <small class="winx-fin__bar-label">${m.label}</small>
    </div>`;
  }
  item(r) {
    return html`<div class="winx-fin__item">
      <span class="winx-fin__item-date">${r.date}</span>
      <span class="winx-fin__item-text">${r.text}</span>
      <span class="winx-fin__item-sum">${r.sum}</span>
    </div>`;
  }

  view({ empty, title, prev, next, totals, transfers, categories, trend, latest }) {
    if (empty) {
      return html`<div class="winx-fin">
        <div class="winx-fin__empty">The ledger is empty: a note per month goes to ${LEDGER}</div>
      </div>`;
    }
    return html`<div class="winx-fin">
      <div class="winx-fin__head">
        <div class="winx-fin__title">${title}</div>
        <div class="winx-fin__nav">
          <button class="winx-fin__nav-btn"${this.step(prev, "prev")}>◀</button>
          <button class="winx-fin__nav-btn"${this.step(next, "next")}>▶</button>
        </div>
      </div>
      <div class="winx-fin__totals">${totals.map(t => this.total(t))}</div>
      ${transfers
        ? html`<div class="winx-fin__section">
          transfers ${transfers} — not counted as spending
        </div>`
        : ""}
      ${categories.length ? html`
        <div class="winx-fin__section">Categories</div>
        <div class="winx-fin__rows">${categories.map(c => this.bar(c))}</div>` : ""}
      ${trend.length ? html`
        <div class="winx-fin__section">Spending by month</div>
        <div class="winx-fin__trend">${trend.map(m => this.month(m))}</div>` : ""}
      ${latest.length ? html`
        <div class="winx-fin__section">Recent transactions</div>
        <div class="winx-fin__list">${latest.map(r => this.item(r))}</div>` : ""}
    </div>`;
  }
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

// The dashboard's Finance card: this month's spent and income on one line, the full Finance note a tap away.
export class FinanceMonth extends Finance {
  async data() {
    const { ledger, months, current } = await this.ledgerState();
    if (!months.length) return { empty: true };
    const { spent, income } = summarize(ledger[current]);
    const month = MONTHS[Number(current.split("-")[1]) - 1];
    return { month, spent: money(spent), income: money(income) };
  }
  sum(text) { return html`<b class="winx-fin-month__sum">${text}</b>`; }
  view({ empty, month, spent, income }) {
    const link = new NoteLink({ text: "💰 open finance", path: "Finance", kind: "text" });
    if (empty) return html`<div class="winx-fin-month">${link}</div>`;
    return html`<div class="winx-fin-month">
      <div>${month}: spent ${this.sum(spent)} · income ${this.sum(income)}</div>
      ${link}
    </div>`;
  }
}
