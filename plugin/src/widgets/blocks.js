// The ```winx block: the widget classes by name, and what the plugin does with a block.
import { parseBlock } from "./parse.js";
import { CelestialMarket } from "./celestialMarket.js";
import { Cycle } from "./cycle.js";
import { DailyNote } from "./dailyNote.js";
import { Finance } from "./finance.js";
import { Goals } from "./goals.js";
import { LifeAreas } from "./lifeAreas.js";
import { LevelToday } from "./levelToday.js";
import { MobileHome } from "./mobileHome.js";
import { MobileShopping } from "./mobileShopping.js";
import { Pomodoro } from "./pomodoro.js";
import { Shop } from "./shop.js";
import { Supplies } from "./supplies.js";
import { Weight } from "./weight.js";
import { XpToday } from "./xpToday.js";

// name → class
export const blocks = { celestialMarket: CelestialMarket, cycle: Cycle, dailyNote: DailyNote, finance: Finance, goals: Goals, levelToday: LevelToday, lifeAreas: LifeAreas, mobileHome: MobileHome, mobileShopping: MobileShopping, pomodoro: Pomodoro, shop: Shop, supplies: Supplies, weight: Weight, xpToday: XpToday };

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  const Widget = blocks[name];
  if (!Widget) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(new Widget(el, ctx.sourcePath, args));
};
