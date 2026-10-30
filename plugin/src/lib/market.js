// The Celestial Market (the shopping list, 00 System/Data/Celestial Market.md) and the supplies bought from it.
// supplyStats / markBought / unmarkBought are pure (tested by tests/lib.test.mjs); the rest reads Dataview's pages.
import config from "./config.js";
import { diffDays, ymd } from "./dates.js";
import { appendLine } from "./files.js";

export const MARKET = "00 System/Data/Celestial Market.md";
// the categories, and "✦ Other" for an item without one
export const marketCats = [...config.marketCategories, { label: "✦ Other", tag: "#other" }];
export const catOf = t => t.tags?.find(tag => marketCats.some(c => c.tag === tag)) ?? "#other";

// Staples from purchase history: anything bought at least twice.
// history: [{name, tag, date}] of completed market items. A forecast (avg days
// between buys) needs 3+ buys; due when 85% of the usual interval has passed.
export const supplyStats = function (history, today) {
  const by = {};
  for (const h of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = h.name.trim().toLowerCase();
    (by[key] ??= { name: key, dates: [], tag: h.tag }).dates.push(h.date);
    by[key].tag = h.tag;
  }
  return Object.values(by).filter(x => x.dates.length >= 2).sort((a, b) => a.name.localeCompare(b.name)).map(x => {
    const gaps  = x.dates.slice(1).map((d, i) => diffDays(d, x.dates[i]));
    const avg   = x.dates.length >= 3 ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length) : null;
    const since = diffDays(today, x.dates.at(-1));
    return { name: x.name, tag: x.tag, buys: x.dates.length, avg, since, due: avg !== null && since >= avg * 0.85 };
  });
};

// Mark an open market line as bought today, the way the Tasks plugin does.
// Lines that are not open tasks come back unchanged.
export const markBought = (line, date) =>
  /^\s*- \[ \]/.test(line) ? `${line.replace("- [ ]", "- [x]").trimEnd()} ✅ ${date}` : line;

// Undo markBought: reopen a bought line and drop its ✅ date.
export const unmarkBought = line =>
  /^\s*- \[x\]/i.test(line) ? line.replace(/- \[x\]/i, "- [ ]").replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/u, "").trimEnd() : line;

export const marketName = t => t.text.replace(/#[\w/]+/g, "").replace(/[✅📅⏳🛫➕🔁].*$/u, "").trim();
const marketTag = t => t.tags?.find(tag => !tag.includes("/")) ?? "#other";

// { history: [{name, tag, date}] of bought items, open: Set of lowercased names still on the list }
export function marketState(dv) {
  const tasks = dv.page(MARKET)?.file.tasks.array() ?? [];
  return {
    history: tasks.filter(t => t.completed && t.completion)
      .map(t => ({ name: marketName(t), tag: marketTag(t), date: ymd(t.completion) })),
    open: new Set(tasks.filter(t => !t.completed).map(t => marketName(t).toLowerCase())),
  };
}

export const addToMarket = (name, tag) => appendLine(MARKET, `- [ ] ${name} ${tag}`);
