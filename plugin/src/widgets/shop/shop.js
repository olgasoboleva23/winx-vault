// Shop: the gold balance and the rewards of Shop.md (name:: … cost:: …); an affordable one is
// bought with a click (logged to Purchases.md), the rest are greyed out. The markup:
// ShopWidget.vue; the purchase:
// controllers/shop.js.
import { balance } from "./wallet.js";
import { AMOUNT, amount } from "../../core/format.js";

export async function loadShop({ dv }) {
  const gold = balance(dv), items = [];

  for (const list of dv.pages('"00 System/Data/Shop"').file.lists) {
    const name = list.text.match(/name::\s*(.+)/);
    const cost = list.text.match(new RegExp(`cost::\\s*(${AMOUNT.source})`));

    if (name && cost) items.push({ name: name[1].trim(), cost: amount(cost[1]) });
  }

  return { balance: gold, items: items.map(i => ({ ...i, affordable: gold >= i.cost })) };
}
