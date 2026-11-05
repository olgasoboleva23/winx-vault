// Celestial Market: the shopping list by category, a round ✓ per item (a sparkle, then it's written
// as bought), what is running low soon and links to the market and the supplies; ＋ by the card's
// title opens the search. The markup: CelestialMarket.vue, the ＋: CelestialMarketAdd.vue.
import { todayYmd } from "../../core/dates.js";
import { editLine } from "../../core/files.js";
import { MARKET, catOf, marketCats, marketState, supplyStats } from "./market.js";
import { MarketItem } from "../../models/marketItem.js";
import { addMarketItem } from "./marketSearch.js";

export async function loadCelestialMarket({ dv }) {
  const page = dv.page(MARKET);

  if (!page) return { missing: true, path: MARKET };
  const mkt = marketState(dv);
  const tasks = page.file.tasks.where(t => !t.completed).array();
  // a row: its line (to find it again) and its name (shown, and to check it's the same item)
  const row = t => ({ line: t.line, name: MarketItem.of(t).name });
  const n = tasks.length;

  return {
    empty: !n,
    left: `${n} item${n === 1 ? "" : "s"} left`,
    groups: marketCats
      .map(cat => ({ label: cat.label, rows: tasks.filter(t => catOf(t) === cat.tag).map(row) }))
      .filter(g => g.rows.length),
    soon: supplyStats(mkt.history, todayYmd()).filter(s => s.due && !mkt.open.has(s.name))
      .map(s => s.name).join(", "),
  };
}

export const celestialMarketActions = () => ({
  add: () => addMarketItem(),
  // a row as bought, if its line is still that item
  buy: ({ line, name }) => {
    const same = l => {
      const item = new MarketItem(l);

      return !item.isBought && item.name === name;
    };

    return editLine(MARKET, line, same, l => new MarketItem(l).bought(todayYmd()));
  },
});
