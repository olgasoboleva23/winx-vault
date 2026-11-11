// The Celestial Market (the shopping list, 00 System/Data/Celestial Market.md) and the supplies
// bought from it, pure (tested by tests/logic.test.mjs, tests/entities.test.mjs); log and
// catalog read by: controllers/widgets/market.js.
import config from "#/helpers/config.js";
import { diffDays } from "#/helpers/dates.js";

// the categories, and "✦ Other" for an item without one
export const marketCats = [...config.marketCategories, { label: "✦ Other", tag: "#other" }];

const isCat = tag => marketCats.some(c => c.tag === tag);

// a tag as a category: an unknown one is Other
export const catOf = tag => isCat(tag) ? tag : "#other";

export const catLabel = tag => marketCats.find(c => c.tag === tag)?.label ?? tag;

// One line of the log: "- [ ] m12" (its record in items.json: name, tag), bought
// "- [x] m12 ✅ date"; a line not migrated yet: "- [ ] green tea #food".
export class MarketItem {
  constructor(line, rec = null) { this.line = line; this.rec = rec; }
  static of(t) { return new MarketItem(`- [${t.status}] ${t.text}`, t.rec ?? null); }
  get isBought() { return /^\s*- \[x\]/i.test(this.line); }
  get id() { return this.line.match(/^\s*- \[.\] (m\d+)(?=\s|$)/)?.[1] ?? null; }
  get isOpen() { return /^\s*- \[ \]/.test(this.line); }
  get doneOn() {
    return this.line.match(/\[completion:: (\d{4}-\d{2}-\d{2})\]/)?.[1]
      ?? this.line.match(/✅\s*(\d{4}-\d{2}-\d{2})/u)?.[1] ?? null;
  }
  get key() { return this.id ?? this.name.trim().toLowerCase(); }
  // the words, as the list shows them: no checkbox, tags, date or Dataview fields
  get name() {
    if (this.rec) return this.rec.name;
    return this.line.replace(/^\s*- \[.\]\s*/, "").replace(/#[\w/]+/g, "")
      .replace(/\[\w+:: [^\]]*\]/g, "").replace(/[✅📅⏳🛫➕🔁].*$/u, "").trim();
  }
  get tags() { return this.line.match(/#[^\s#]+/gu) ?? []; }
  // its tag: the record's, or the line's first that is a category
  get tag() { return this.rec ? this.rec.tag : this.tags.find(isCat) ?? "#other"; }
  get category() { return catOf(this.tag); }
  // bought on `date`, the way the Tasks plugin marks it; a line that isn't open comes back as it is
  bought(date) {
    if (!this.isOpen) return this.line;

    return `${this.line.replace("- [ ]", "- [x]").trimEnd()} ✅ ${date}`;
  }
  // back on the list: open, without its ✅ date
  unbought() {
    if (!this.isBought) return this.line;
    return this.line.replace(/- \[x\]/i, "- [ ]")
      .replace(/\s*✅\s*\d{4}-\d{2}-\d{2}/u, "").trimEnd();
  }
}

// what was bought and when (a legacy line has no id), and the keys on the list now
export const historyOf = items => items.filter(i => i.isBought && i.doneOn)
  .map(i => ({ id: i.rec ? i.id : undefined, name: i.name, tag: i.tag, date: i.doneOn }));

export const openKeys = items => new Set(items.filter(i => i.isOpen).map(i => i.key));

// the id after the highest m<N> among `ids`
export const nextMarketId = ids =>
  `m${Math.max(0, ...ids.filter(k => /^m\d+$/.test(k ?? "")).map(k => +k.slice(1))) + 1}`;

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
