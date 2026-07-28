// Finance widget — reads the per-month ledgers written by
// 00 System/Scripts/finance/import_statement.py and renders a month summary,
// category breakdown, 6-month trend and the latest operations.
//
// This file is synced from winx-vault along with the rest of 00 System/Scripts,
// so edit it THERE — a local edit here is wiped by the next sync. The data it
// reads (02 Areas/Finance) is outside the sync scope and stays vault-local.
//
// Styles are injected from this file rather than shipped as a CSS snippet, so
// the widget stays self-contained; they only use --winx-* tokens, so
// re-theming still carries through.
//
// Usage:  dv.view("00 System/Scripts/dvWidgets/finance");

const LEDGER = "02 Areas/Finance/Ledger";
const RULES = "02 Areas/Finance/rules.json";
const TRANSFER = "Переводы";

const MONTHS = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь",
                "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
const MONTHS_SHORT = ["янв", "фев", "мар", "апр", "май", "июн",
                      "июл", "авг", "сен", "окт", "ноя", "дек"];

// Palette cycled across categories, in winx token order.
const PALETTE = ["--winx-pink", "--winx-gold", "--winx-purple", "--winx-lavender",
                 "--winx-blue", "--winx-pink-deep", "--winx-gold-deep", "--winx-purple-light"];

const money = (n) =>
  new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 0 }).format(Math.round(n)) + " ₽";

// ===== data =====================================================================
async function loadRules() {
  try {
    return JSON.parse(await app.vault.adapter.read(RULES));
  } catch {
    return { budgets: {} };
  }
}

// Parses the pipe tables directly — no dependency on dataview inline fields,
// so a hand-added cash row behaves exactly like an imported one.
async function loadLedger() {
  const listing = await app.vault.adapter.list(LEDGER).catch(() => null);
  if (!listing) return {};

  const months = {};
  for (const file of listing.files.filter((f) => f.endsWith(".md"))) {
    const month = file.slice(file.lastIndexOf("/") + 1, -3);
    const rows = [];
    for (const line of (await app.vault.adapter.read(file)).split("\n")) {
      const text = line.trim();
      if (!text.startsWith("|")) continue;
      const cells = text.slice(1, -1).split("|").map((c) => c.trim());
      if (cells.length !== 5) continue;
      if (cells[0] === "date" || /^[-:\s]+$/.test(cells[0])) continue;
      const amount = Number(cells[2]);
      if (!Number.isFinite(amount)) continue;
      rows.push({ date: cells[0], time: cells[1], amount, category: cells[3], description: cells[4] });
    }
    if (rows.length) months[month] = rows;
  }
  return months;
}

// Transfers are money moving between your own accounts or split bills — they
// are kept in the ledger but excluded from spending and income.
function summarize(rows) {
  const totals = { spent: 0, income: 0, transfers: 0, categories: {} };
  for (const row of rows) {
    if (row.category === TRANSFER) {
      totals.transfers += Math.abs(row.amount);
    } else if (row.amount < 0) {
      totals.spent += -row.amount;
      totals.categories[row.category] = (totals.categories[row.category] ?? 0) + -row.amount;
    } else {
      totals.income += row.amount;
    }
  }
  return totals;
}

// ===== rendering ================================================================
function injectStyles() {
  if (document.getElementById("winx-finance-styles")) return;
  const style = document.createElement("style");
  style.id = "winx-finance-styles";
  style.textContent = `
    .winx-fin { display: flex; flex-direction: column; gap: 14px; font-size: 14px; }
    .winx-fin-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; }
    .winx-fin-month { font-weight: 600; letter-spacing: .02em; color: var(--winx-text-dark); }
    .winx-fin-nav { display: flex; gap: 4px; }
    .winx-fin-nav button {
      all: unset; cursor: pointer; padding: 2px 9px; border-radius: 8px; line-height: 1.5;
      background: rgb(from var(--winx-purple) r g b / 18%); color: var(--winx-text-dark);
    }
    .winx-fin-nav button:hover { background: rgb(from var(--winx-pink) r g b / 32%); }
    .winx-fin-nav button[disabled] { opacity: .3; cursor: default; }

    .winx-fin-totals { display: flex; gap: 10px; }
    .winx-fin-total {
      flex: 1; padding: 8px 10px; border-radius: 12px; text-align: center;
      background: rgb(from var(--winx-purple) r g b / 12%);
    }
    .winx-fin-total span { display: block; font-size: 11px; opacity: .7; margin-bottom: 2px; }
    .winx-fin-total b { font-size: 16px; font-weight: 600; }
    .winx-fin-total.is-neg b { color: var(--winx-pink-deep); }
    .winx-fin-total.is-pos b { color: var(--winx-gold-deep); }

    .winx-fin-section { font-size: 11px; text-transform: uppercase; letter-spacing: .08em; opacity: .65; }
    .winx-fin-rows { display: flex; flex-direction: column; gap: 6px; }
    .winx-fin-row { display: grid; grid-template-columns: 1fr auto; gap: 2px 8px; }
    .winx-fin-row .amt { font-variant-numeric: tabular-nums; }
    .winx-fin-row .over { color: var(--winx-pink-deep); font-weight: 600; }
    .winx-fin-track {
      grid-column: 1 / -1; height: 8px; border-radius: 5px; overflow: hidden;
      background: rgb(from var(--winx-purple) r g b / 14%);
    }
    .winx-fin-fill { height: 100%; border-radius: 5px; transition: width .3s ease; }

    .winx-fin-trend { display: flex; align-items: flex-end; gap: 6px; height: 78px; }
    .winx-fin-bar { flex: 1; display: flex; flex-direction: column; align-items: center; gap: 4px; height: 100%; }
    .winx-fin-bar .col { width: 100%; margin-top: auto; border-radius: 5px 5px 0 0;
      background: linear-gradient(to top, var(--winx-purple), var(--winx-pink)); }
    .winx-fin-bar.is-current .col { background: linear-gradient(to top, var(--winx-gold-deep), var(--winx-gold)); }
    .winx-fin-bar small { font-size: 10px; opacity: .7; }

    .winx-fin-list { display: flex; flex-direction: column; gap: 3px; font-size: 12.5px; }
    .winx-fin-item { display: grid; grid-template-columns: auto 1fr auto; gap: 8px; align-items: baseline; }
    .winx-fin-item .d { opacity: .55; font-variant-numeric: tabular-nums; }
    .winx-fin-item .t { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
    .winx-fin-item .a { font-variant-numeric: tabular-nums; opacity: .85; }
    .winx-fin-empty { opacity: .6; font-style: italic; }
  `;
  document.head.appendChild(style);
}

function bar(parent, label, value, max, color, budget) {
  const row = parent.createDiv({ cls: "winx-fin-row" });
  row.createSpan({ text: label });
  const amount = row.createSpan({ cls: "amt" });
  if (budget) {
    const pct = Math.round((value / budget) * 100);
    amount.setText(`${money(value)} / ${money(budget)} · ${pct}%`);
    if (value > budget) amount.addClass("over");
  } else {
    amount.setText(money(value));
  }
  const fill = row.createDiv({ cls: "winx-fin-track" }).createDiv({ cls: "winx-fin-fill" });
  const ratio = budget ? Math.min(value / budget, 1) : value / (max || 1);
  fill.style.width = `${Math.max(ratio * 100, 1.5)}%`;
  fill.style.background = budget && value > budget
    ? "var(--winx-pink-deep)"
    : `var(${color})`;
}

// ===== main =====================================================================
injectStyles();

const [ledger, rules] = await Promise.all([loadLedger(), loadRules()]);
const budgets = rules.budgets ?? {};
const available = Object.keys(ledger).sort();

const root = dv.container.createDiv({ cls: "winx-fin" });

if (!available.length) {
  root.createDiv({
    cls: "winx-fin-empty",
    text: "Леджер пуст. Выгрузи выписку из СберБанк Онлайн в 02 Areas/Finance/Statements "
        + "и запусти 00 System/Scripts/finance/import.sh",
  });
  return;
}

const now = new Date();
const thisMonth = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
let current = available.includes(thisMonth) ? thisMonth : available[available.length - 1];

function render() {
  root.empty();
  const rows = ledger[current] ?? [];
  const totals = summarize(rows);
  const [year, month] = current.split("-");

  // header + month navigation
  const head = root.createDiv({ cls: "winx-fin-head" });
  head.createDiv({ cls: "winx-fin-month", text: `${MONTHS[Number(month) - 1]} ${year}` });
  const nav = head.createDiv({ cls: "winx-fin-nav" });
  const index = available.indexOf(current);
  const prev = nav.createEl("button", { text: "◀" });
  const next = nav.createEl("button", { text: "▶" });
  if (index <= 0) prev.setAttr("disabled", "true");
  else prev.onclick = () => { current = available[index - 1]; render(); };
  if (index >= available.length - 1) next.setAttr("disabled", "true");
  else next.onclick = () => { current = available[index + 1]; render(); };

  // totals
  const totalsEl = root.createDiv({ cls: "winx-fin-totals" });
  const net = totals.income - totals.spent;
  const cards = [
    ["Потрачено", totals.spent, "is-neg"],
    ["Получено", totals.income, "is-pos"],
    ["Итого", net, net < 0 ? "is-neg" : "is-pos"],
  ];
  for (const [label, value, cls] of cards) {
    const card = totalsEl.createDiv({ cls: `winx-fin-total ${cls}` });
    card.createSpan({ text: label });
    card.createEl("b", { text: money(value) });
  }
  if (totals.transfers > 0) {
    root.createDiv({
      cls: "winx-fin-section",
      text: `переводы ${money(totals.transfers)} — не считаются тратами`,
    });
  }

  // categories
  const categories = Object.entries(totals.categories).sort((a, b) => b[1] - a[1]);
  if (categories.length) {
    root.createDiv({ cls: "winx-fin-section", text: "Категории" });
    const list = root.createDiv({ cls: "winx-fin-rows" });
    const max = categories[0][1];
    categories.forEach(([name, value], i) => {
      bar(list, name, value, max, PALETTE[i % PALETTE.length], budgets[name]);
    });
  }

  // 6-month trend
  const window6 = available.slice(Math.max(0, index - 5), index + 1);
  if (window6.length > 1) {
    root.createDiv({ cls: "winx-fin-section", text: "Траты по месяцам" });
    const trend = root.createDiv({ cls: "winx-fin-trend" });
    const spends = window6.map((m) => summarize(ledger[m]).spent);
    const peak = Math.max(...spends, 1);
    window6.forEach((m, i) => {
      const cell = trend.createDiv({ cls: `winx-fin-bar${m === current ? " is-current" : ""}` });
      const col = cell.createDiv({ cls: "col" });
      col.style.height = `${Math.max((spends[i] / peak) * 100, 3)}%`;
      col.setAttr("aria-label", money(spends[i]));
      cell.createEl("small", { text: MONTHS_SHORT[Number(m.split("-")[1]) - 1] });
    });
  }

  // latest operations
  const latest = rows
    .filter((r) => r.category !== TRANSFER)
    .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time))
    .slice(0, 8);
  if (latest.length) {
    root.createDiv({ cls: "winx-fin-section", text: "Последние операции" });
    const list = root.createDiv({ cls: "winx-fin-list" });
    for (const row of latest) {
      const item = list.createDiv({ cls: "winx-fin-item" });
      item.createSpan({ cls: "d", text: row.date.slice(8) + "." + row.date.slice(5, 7) });
      item.createSpan({ cls: "t", text: `${row.category} · ${row.description}` });
      item.createSpan({ cls: "a", text: money(row.amount) });
    }
  }
}

render();
