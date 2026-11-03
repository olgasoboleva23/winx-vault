// The shop's gold: earned by done tasks (by difficulty), spent in 00 System/Data/Purchases.md ("- date | name | cost").
import config from "../../core/config.js";
import { todayYmd } from "../../core/dates.js";
import { appendLine } from "../../core/files.js";
import { amount } from "../../core/format.js";
import { TASKS } from "../../core/paths.js";
import { dataview } from "../../core/plugins.js";
import { app } from "../../core/app.js";

const PURCHASES = "00 System/Data/Purchases.md";

function earned(dv) {
  let gold = 0;
  for (const t of dv.pages(`"${TASKS}"`).file.tasks) if (t.completed) gold += config.difficulties.find(d => t.tags.includes(d.tag))?.gold ?? 0;
  return gold;
}
// a purchase's cost: the line's last field ("… | 1984 | 20" costs 20; 2,5 or 1 000 too)
const cost = text => amount(text.split("|").at(-1)) ?? 0;
const spent = lines => [...lines].reduce((a, l) => a + cost(l), 0);

export const balance = dv => earned(dv) - spent([...dv.pages('"00 System/Data/Purchases"').file.lists].map(l => l.text));

// a purchase, only when the gold covers it (the Shop card and the Buy reward command): false when it doesn't.
// One at a time, the spent gold read from the file itself: Dataview sees a purchase a moment later
let queue = Promise.resolve();
export function logPurchase(name, price) {
  const buy = queue.then(async () => {
    const file = app.vault.getFileByPath(PURCHASES);
    const lines = file ? (await app.vault.read(file)).split("\n").filter(l => l.startsWith("- ")) : [];
    if (earned(dataview()) - spent(lines) < price) return false;
    await appendLine(PURCHASES, `- ${todayYmd()} | ${name} | ${price}`, { header: "# Purchases\n\n" });
    return true;
  });
  queue = buy.catch(() => {});
  return buy;
}
