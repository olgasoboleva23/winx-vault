// The shop's gold: earned by done tasks (by difficulty), spent in 00 System/Data/Purchases.md ("- date | name | cost").
import config from "../../core/config.js";
import { todayYmd } from "../../core/dates.js";
import { appendLine } from "../../core/files.js";

const PURCHASES = "00 System/Data/Purchases.md";

export function balance(dv) {
  let earned = 0, spent = 0;
  for (const t of dv.pages('"02 Areas/Personal/Tasks"').file.tasks)
    if (t.completed) earned += config.difficulties.find(d => t.tags.includes(d.tag))?.gold ?? 0;
  for (const line of dv.pages('"00 System/Data/Purchases"').file.lists)
    spent += Number(line.text.match(/\|\s*(\d+)/)?.[1] ?? 0);
  return earned - spent;
}

export const logPurchase = (name, cost) => appendLine(PURCHASES, `- ${todayYmd()} | ${name} | ${cost}`, { header: "# Purchases\n\n" });
