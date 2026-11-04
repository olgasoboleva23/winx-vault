// Shop: the gold balance and the rewards of Shop.md (name:: … cost:: …); an affordable one is
// bought with a click (logged to Purchases.md), the rest are greyed out. The markup:
// ShopWidget.vue.
import { Notice } from "obsidian";
import { AudioEngine } from "../../core/sounds.js";
import { balance, logPurchase } from "./wallet.js";
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

// buy(name, cost): the star sound, the purchase if the gold covers it, a notice either way; true
// when bought
export function shopActions() {
  const sound = new AudioEngine("00 System/Assets/star.wav");

  return {
    buy: async (name, cost) => {
      void sound.play();
      const bought = await logPurchase(name, cost);
      new Notice(bought ? `✨ Bought ${name} for ${cost} gold` : `✦ Not enough gold for ${name}`);
      return bought;
    },
  };
}
