// The ```winx block: the widget classes by name, and what the plugin does with a block.
import { parseBlock } from "./parse.js";
import { CelestialMarket } from "./celestialMarket.js";
import { Cycle } from "./cycle.js";
import { DailyNote } from "./dailyNote.js";
import { Goals } from "./goals.js";
import { Habits } from "./habits.js";
import { LifeAreas } from "./lifeAreas.js";
import { LevelToday } from "./levelToday.js";
import { MobileHome } from "./mobileHome.js";
import { Shop } from "./shop.js";
import { Supplies } from "./supplies.js";
import { Wallet } from "./wallet.js";
import { WeeklyState } from "./weeklyState.js";
import { XpToday } from "./xpToday.js";

// name → class; each widget adds itself here as it moves to a class
export const blocks = { celestialMarket: CelestialMarket, cycle: Cycle, dailyNote: DailyNote, goals: Goals, habits: Habits, levelToday: LevelToday, lifeAreas: LifeAreas, mobileHome: MobileHome, shop: Shop, supplies: Supplies, wallet: Wallet, weeklyState: WeeklyState, xpToday: XpToday };

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  const Widget = blocks[name];
  if (!Widget) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(new Widget(el, ctx.sourcePath, args));
};
