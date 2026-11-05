// The shop's controller: the gold (earned by done tasks, by difficulty; spent in
// 00 System/Data/Purchases.md: "- date | name | cost") and the rewards of Shop.md (name:: …
// cost:: …), an affordable one bought with a click, the rest greyed out. Writes: a purchase, only
// when the gold covers it (the Shop card and the Buy reward command), with its sound and notice.
// The markup: widgets/shop/ShopWidget.
import config from "#/helpers/config.js";
import { amount, AMOUNT } from "#/helpers/format.js";
import { ASSETS, PURCHASES, SHOP } from "#/helpers/paths.js";
import { Notice } from "obsidian";
import { todayYmd } from "#/helpers/dates.js";
import { appendLine } from "#/helpers/files.js";
import { T } from "#/models/calendarData.js";
import { taskStore } from "#/store/tasks.js";
import { AudioEngine } from "#/helpers/sounds.js";
import { app } from "#/helpers/app.js";

export function earned() {
  let gold = 0;

  for (const t of taskStore.tasks.map(T)) {
    if (t.isDone) gold += config.difficulties.find(d => t.tags.includes(d.tag))?.gold ?? 0;
  }

  return gold;
}

// a purchase's cost: the line's last field ("… | 1984 | 20" costs 20; 2,5 or 1 000 too)
const cost = text => amount(text.split("|").at(-1)) ?? 0;

export const spent = lines => [...lines].reduce((a, l) => a + cost(l), 0);

export const balance = dv =>
  earned() - spent([...dv.pages(`"${PURCHASES}"`).file.lists].map(l => l.text));

export async function loadShop({ dv }) {
  const gold = balance(dv), items = [];

  for (const list of dv.pages(`"${SHOP}"`).file.lists) {
    const name = list.text.match(/name::\s*(.+)/);
    const cost = list.text.match(new RegExp(`cost::\\s*(${AMOUNT.source})`));

    if (name && cost) items.push({ name: name[1].trim(), cost: amount(cost[1]) });
  }

  return { balance: gold, items: items.map(i => ({ ...i, affordable: gold >= i.cost })) };
}

const PURCHASES_NOTE = `${PURCHASES}.md`;

// a purchase, only when the gold covers it (the Shop card and the Buy reward command): false when
// it doesn't. One at a time, the spent gold read from the file itself: Dataview sees a purchase a
// moment later (the gold earned: the plugin's own store, at once)
let queue = Promise.resolve();

export function logPurchase(name, price) {
  const buy = queue.then(async () => {
    const file = app.vault.getFileByPath(PURCHASES_NOTE);
    const text = file ? await app.vault.read(file) : "";
    const lines = text.split("\n").filter(l => l.startsWith("- "));

    if (earned() - spent(lines) < price) return false;
    await appendLine(PURCHASES_NOTE, `- ${todayYmd()} | ${name} | ${price}`,
      { header: "# Purchases\n\n" });
    return true;
  });
  queue = buy.catch(() => {});
  return buy;
}

// buy(name, cost): the star sound, the purchase if the gold covers it, a notice either way; true
// when bought
export function shopActions() {
  const sound = new AudioEngine(`${ASSETS}/star.wav`);

  return {
    buy: async (name, cost) => {
      void sound.play();
      const bought = await logPurchase(name, cost);
      new Notice(bought ? `✨ Bought ${name} for ${cost} gold` : `✦ Not enough gold for ${name}`);
      return bought;
    },
  };
}
