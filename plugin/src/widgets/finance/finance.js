// Finance: the per-month ledger notes (one per month, in core/paths.js LEDGER) — a month's totals,
// categories against their budgets, a 6-month trend and the latest operations; ◀ ▶ step through the months.
// The data (00 System/Data/Finance) stays in the vault; styles in styles/widgets/_finance.scss
// (blocks winx-fin, winx-fin-month).
import { html } from "../../core/html.js";
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
    if (!months.length) {
      return html`<div class="winx-fin">
        <div class="winx-fin__empty">The ledger is empty: a note per month goes to ${LEDGER}</div>
      </div>`;
    }
    const { totals, index, net, categories, trend, peak, latest } = monthReport(ledger, months, current);
    const height = spent => Math.max(spent / peak * 100, 3);   // a month's bar, % of the biggest
    const [year, month] = current.split("-");
    const bar = (name, value, max, color, budget) => {
      const ratio = budget ? Math.min(value / budget, 1) : value / (max || 1);
      const fill = budget && value > budget ? "var(--winx-pink-deep)" : `var(${color})`;
      const over = budget && value > budget ? " winx-fin__amt--over" : "";
      const share = budget && Math.round(value / budget * 100);
      return html`<div class="winx-fin__row">
        <span>${name}</span>
        ${budget
          ? html`<span class="winx-fin__amt${over}">${money(value)} / ${money(budget)} · ${share}%</span>`
          : html`<span class="winx-fin__amt">${money(value)}</span>`}
        <div class="winx-fin__track">
          <div class="winx-fin__fill" style="width: ${Math.max(ratio * 100, 1.5)}%; background: ${fill};"></div>
        </div>
      </div>`;
    };
    const totalsRow = [
      ["Spent", totals.spent, "neg"], ["Received", totals.income, "pos"], ["Net", net, net < 0 ? "neg" : "pos"],
    ];
    const step = (on, action) => on ? html` data-action="${action}"` : html` disabled="true"`;
    return html`<div class="winx-fin">
      <div class="winx-fin__head">
        <div class="winx-fin__title">${MONTHS[Number(month) - 1]} ${year}</div>
        <div class="winx-fin__nav">
          <button class="winx-fin__nav-btn"${step(index > 0, "prev")}>◀</button>
          <button class="winx-fin__nav-btn"${step(index < months.length - 1, "next")}>▶</button>
        </div>
      </div>
      <div class="winx-fin__totals">${totalsRow.map(([label, value, sign]) => html`
        <div class="winx-fin__total winx-fin__total--${sign}">
          <span class="winx-fin__total-label">${label}</span>
          <b class="winx-fin__total-value">${money(value)}</b>
        </div>`)}
      </div>
      ${totals.transfers > 0
        ? html`<div class="winx-fin__section">transfers ${money(totals.transfers)} — not counted as spending</div>`
        : ""}
      ${categories.length ? html`
        <div class="winx-fin__section">Categories</div>
        <div class="winx-fin__rows">${categories.map(([name, value], i) =>
          bar(name, value, categories[0][1], PALETTE[i % PALETTE.length], budgets[name]))}</div>` : ""}
      ${trend.length > 1 ? html`
        <div class="winx-fin__section">Spending by month</div>
        <div class="winx-fin__trend">${trend.map(({ month: m, spent }) => html`
          <div class="winx-fin__bar${m === current ? " winx-fin__bar--current" : ""}">
            <div class="winx-fin__col" style="height: ${height(spent)}%;" aria-label="${money(spent)}"></div>
            <small class="winx-fin__bar-label">${MONTHS_SHORT[Number(m.split("-")[1]) - 1]}</small>
          </div>`)}
        </div>` : ""}
      ${latest.length ? html`
        <div class="winx-fin__section">Recent transactions</div>
        <div class="winx-fin__list">${latest.map(r => html`
          <div class="winx-fin__item">
            <span class="winx-fin__item-date">${dm(r.date)}</span>
            <span class="winx-fin__item-text">${r.category} · ${r.description}</span>
            <span class="winx-fin__item-sum">${money(r.amount)}</span>
          </div>`)}
        </div>` : ""}
    </div>`;
  }
}

// The dashboard's Finance card: this month's spent and income on one line, the full Finance note a tap away.
export class FinanceMonth extends Finance {
  view({ ledger, months, current }) {
    const link = new NoteLink({ text: "💰 open finance", path: "Finance", kind: "text" });
    if (!months.length) return html`<div class="winx-fin-month">${link}</div>`;
    const { spent, income } = summarize(ledger[current]);
    const sum = n => html`<b class="winx-fin-month__sum">${money(n)}</b>`;
    return html`<div class="winx-fin-month">
      <div>${MONTHS[Number(current.split("-")[1]) - 1]}: spent ${sum(spent)} · income ${sum(income)}</div>
      ${link}
    </div>`;
  }
}
