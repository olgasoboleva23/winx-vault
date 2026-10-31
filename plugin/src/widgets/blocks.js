// The ```winx block: the widget classes by name, and what the plugin does with a block.
import { parseBlock } from "./parse.js";
import { CelestialMarket } from "./market/celestialMarket.js";
import { Cycle } from "./body/cycle.js";
import { DailyNote } from "./dailyNote.js";
import { Finance, FinanceMonth } from "./finance.js";
import { Goals } from "./goals/goals.js";
import { LifeAreas } from "./xp/lifeAreas.js";
import { LevelToday } from "./xp/levelToday.js";
import { Savings } from "./savings/savings.js";
import { Pomodoro } from "./pomodoro.js";
import { Shop } from "./shop/shop.js";
import { Supplies } from "./market/supplies.js";
import { Weight } from "./body/weight.js";
import { XpToday } from "./xp/xpToday.js";

// name → class
export const blocks = { celestialMarket: CelestialMarket, cycle: Cycle, dailyNote: DailyNote, finance: Finance, financeMonth: FinanceMonth, goals: Goals, levelToday: LevelToday, lifeAreas: LifeAreas, pomodoro: Pomodoro, savings: Savings, shop: Shop, supplies: Supplies, weight: Weight, xpToday: XpToday };

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  const Widget = blocks[name];
  if (!Widget) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(new Widget(el, ctx.sourcePath, args));
};
