// The shop's gold: earned by done tasks (by difficulty), spent in 00 System/Data/Purchases.md ("-
// date | name | cost"). The purchase itself: controllers/shop.js.
import config from "../../core/config.js";
import { amount } from "../../core/format.js";
import { TASKS } from "../../core/paths.js";

export function earned(dv) {
  let gold = 0;

  for (const t of dv.pages(`"${TASKS}"`).file.tasks) {
    if (t.completed) gold += config.difficulties.find(d => t.tags.includes(d.tag))?.gold ?? 0;
  }

  return gold;
}

// a purchase's cost: the line's last field ("… | 1984 | 20" costs 20; 2,5 or 1 000 too)
const cost = text => amount(text.split("|").at(-1)) ?? 0;

export const spent = lines => [...lines].reduce((a, l) => a + cost(l), 0);

export const balance = dv =>
  earned(dv) - spent([...dv.pages('"00 System/Data/Purchases"').file.lists].map(l => l.text));
