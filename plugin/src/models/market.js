// The Celestial Market (the shopping list, 00 System/Data/Celestial Market.md) and the supplies
// bought from it, pure (supplyStats: tested by tests/logic.test.mjs); log and catalog read by:
// controllers/widgets/market.js. One line: models/marketItem.js.
import config from "#/helpers/config.js";
import { diffDays } from "#/helpers/dates.js";

// the categories, and "✦ Other" for an item without one
export const marketCats = [...config.marketCategories, { label: "✦ Other", tag: "#other" }];

export const catOf = t => t.tags?.find(tag => marketCats.some(c => c.tag === tag)) ?? "#other";

// Staples from purchase history: anything bought at least twice.
// history: [{name, tag, date}] of completed market items. A forecast (avg days
// between buys) needs 3+ buys; due when 85% of the usual interval has passed.
export const supplyStats = function (history, today) {
  const by = {};

  for (const h of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = h.id ?? h.name.trim().toLowerCase();
    (by[key] ??= { id: h.id, name: h.id ? h.name : key, dates: [], tag: h.tag }).dates.push(h.date);
    by[key].tag = h.tag;
  }

  const twice = Object.values(by).filter(x => x.dates.length >= 2);

  return twice.sort((a, b) => a.name.localeCompare(b.name)).map(x => {
    const gaps  = x.dates.slice(1).map((d, i) => diffDays(d, x.dates[i]));
    const avg   = x.dates.length >= 3
      ? Math.round(gaps.reduce((a, b) => a + b, 0) / gaps.length)
      : null;
    const since = diffDays(today, x.dates.at(-1));
    const due   = avg !== null && since >= avg * 0.85;

    return {
      ...x.id ? { id: x.id } : {}, name: x.name, tag: x.tag, buys: x.dates.length, avg, since, due,
    };
  });
};

// Everything bought before, for the search: one per name (its last spelling and category), by
// category, then the most bought and the most recent first; onList when it's on the list now
// (`open`: lowercased names).
export function marketChoices(history, open, records = {}) {
  const by = Object.fromEntries(Object.entries(records).map(([id, r]) => [id, {
    id, name: r.name, tag: r.tag, buys: 0, last: "", onList: open.has(id),
  }]));

  for (const h of [...history].sort((a, b) => a.date.localeCompare(b.date))) {
    const key = h.id ?? h.name.trim().toLowerCase();
    by[key] = {
      ...h.id ? { id: h.id } : {},
      name: h.name.trim(),
      tag: h.tag,
      buys: (by[key]?.buys ?? 0) + 1,
      last: h.date,
      onList: open.has(key),
    };
  }

  const rank = tag => marketCats.findIndex(c => c.tag === tag) >>> 0;   // unknown tags last

  return Object.values(by).sort((a, b) =>
    rank(a.tag) - rank(b.tag) || b.buys - a.buys || b.last.localeCompare(a.last));
}
