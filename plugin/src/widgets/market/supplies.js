// Supplies: what is bought again and again (from the Celestial Market's done items), how long since the last
// time against the usual gap, and "running low" to put one back on the shopping list. The markup: SuppliesWidget.vue.
import { Notice } from "obsidian";
import { todayYmd } from "../../core/dates.js";
import { addToMarket, marketCats, marketState, supplyStats } from "./market.js";

export async function loadSupplies({ dv }) {
  const { history, open } = marketState(dv);
  const stats = supplyStats(history, todayYmd());
  const groupOf = s => marketCats.some(c => c.tag === s.tag) ? s.tag : "#other";
  // a row: how long since the last time against the usual gap, or that it's on the list already
  const row = s => {
    const listed = open.has(s.name);
    const info = listed ? "on the shopping list ✦"
      : s.avg ? `${s.since} of ~${s.avg} days${s.due ? " ⏳" : ""}`
      : `bought ${s.buys} times`;
    return { name: s.name, tag: s.tag, due: s.due, listed, info };
  };
  return {
    empty: !stats.length,
    groups: marketCats
      .map(cat => ({ label: cat.label, rows: stats.filter(s => groupOf(s) === cat.tag).map(row) }))
      .filter(g => g.rows.length),
  };
}

// low(name, tag): back on the Celestial Market's list
export const suppliesActions = () => ({
  low: async (name, tag) => {
    await addToMarket(name, tag);
    new Notice(`✦ ${name} → Celestial Market`);
  },
});
