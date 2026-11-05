// The writes of the shop: a purchase into 00 System/Data/Purchases.md, only when the gold covers it
// (the Shop card and the Buy reward command), and the Shop card's buy with its sound and notice.
import { Notice } from "obsidian";
import { todayYmd } from "../core/dates.js";
import { appendLine } from "../core/files.js";
import { dataview } from "../core/plugins.js";
import { AudioEngine } from "../core/sounds.js";
import { app } from "../core/app.js";
import { earned, spent } from "../widgets/shop/wallet.js";

const PURCHASES = "00 System/Data/Purchases.md";

// a purchase, only when the gold covers it (the Shop card and the Buy reward command): false when
// it doesn't. One at a time, the spent gold read from the file itself: Dataview sees a purchase a
// moment later
let queue = Promise.resolve();

export function logPurchase(name, price) {
  const buy = queue.then(async () => {
    const file = app.vault.getFileByPath(PURCHASES);
    const text = file ? await app.vault.read(file) : "";
    const lines = text.split("\n").filter(l => l.startsWith("- "));

    if (earned(dataview()) - spent(lines) < price) return false;
    await appendLine(PURCHASES, `- ${todayYmd()} | ${name} | ${price}`,
      { header: "# Purchases\n\n" });
    return true;
  });
  queue = buy.catch(() => {});
  return buy;
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
