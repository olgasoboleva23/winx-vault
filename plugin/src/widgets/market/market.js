// The Celestial Market (the shopping list, 00 System/Data/Celestial Market.md) and the supplies bought from it.
// supplyStats is pure (tested by tests/logic.test.mjs); the rest reads Dataview's pages. One line: marketItem.js.
import config from "../../core/config.js";
import { diffDays, ymd } from "../../core/dates.js";
import { MarketItem } from "./marketItem.js";
import { appendLine } from "../../core/files.js";

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

// Everything bought before, for the search: one per name (its last spelling and category), by category,
// then the most bought and the most recent first; onList when it's on the list now (`open`: lowercased names).
export function marketChoices(history, open) {
  const by = {};
  for (const h of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = h.name.trim().toLowerCase();
    by[key] = { name: h.name.trim(), tag: h.tag, buys: (by[key]?.buys ?? 0) + 1, last: h.date, onList: open.has(key) };
  }
  const rank = tag => marketCats.findIndex(c => c.tag === tag) >>> 0;   // unknown tags last
  return Object.values(by).sort((a, b) => rank(a.tag) - rank(b.tag) || b.buys - a.buys || b.last.localeCompare(a.last));
}

// { history: [{name, tag, date}] of bought items, open: Set of lowercased names still on the list }
export function marketState(dv) {
  const tasks = dv.page(MARKET)?.file.tasks.array() ?? [];
  return {
    history: tasks.filter(t => t.completed && t.completion)
      .map(t => { const i = MarketItem.of(t); return { name: i.name, tag: i.tag, date: ymd(t.completion) }; }),
    open: new Set(tasks.filter(t => !t.completed).map(t => MarketItem.of(t).name.toLowerCase())),
  };
}

export const addToMarket = (name, tag) => appendLine(MARKET, `- [ ] ${name} ${tag}`);
