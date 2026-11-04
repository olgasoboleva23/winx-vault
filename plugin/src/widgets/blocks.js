// The ```winx block: the widget classes by name, and what the plugin does with a block.
import { parseBlock } from "./parse.js";
import { DailyNote } from "./dailyNote.js";
import { Pomodoro } from "./pomodoro/pomodoro.js";
import { loadXpToday } from "./xp/xpToday.js";
import XpToday from "./xp/XpToday.vue";
import { loadLevelToday } from "./xp/levelToday.js";
import LevelToday from "./xp/LevelToday.vue";
import { loadLifeAreas } from "./xp/lifeAreas.js";
import LifeAreas from "./xp/LifeAreas.vue";
import { loadShop, shopActions } from "./shop/shop.js";
import ShopWidget from "./shop/ShopWidget.vue";
import { loadSupplies, suppliesActions } from "./market/supplies.js";
import SuppliesWidget from "./market/SuppliesWidget.vue";
import { celestialMarketActions, loadCelestialMarket } from "./market/celestialMarket.js";
import CelestialMarket from "./market/CelestialMarket.vue";
import CelestialMarketAdd from "./market/CelestialMarketAdd.vue";
import { loadGoals } from "./goals/goals.js";
import GoalsWidget from "./goals/GoalsWidget.vue";
import { loadSavings, savingsActions } from "./savings/savings.js";
import SavingsJars from "./savings/SavingsJars.vue";
import { cycleActions, loadCycle } from "./body/cycle.js";
import CycleWidget from "./body/CycleWidget.vue";
import { loadFinance, loadFinanceLine } from "./finance/finance.js";
import FinanceMonths from "./finance/FinanceMonths.vue";
import FinanceLine from "./finance/FinanceLine.vue";
import { loadWeight, weightActions } from "./body/weight.js";
import WeightCard from "./body/WeightCard.vue";
import { MarkdownRenderChild } from "obsidian";
import { VueHost } from "../core/vueHost.ts";
import { blockDv } from "../core/plugins.js";
import { app } from "../core/app.js";

// name → class
export const blocks = {
  dailyNote: DailyNote, pomodoro: Pomodoro,
};

// the widgets moved to Vue: name → { view: the .vue, load(ctx): its data, actions(ctx): its writes, cardButton:
// a .vue next to the card's title, bodyClass: a class on the card's body, follows: false to load once },
// where ctx is { dv, app, args, sourcePath } (dv: blockDv)
export const vueBlocks = {
  xpToday: { view: XpToday, load: loadXpToday },
  levelToday: { view: LevelToday, load: loadLevelToday },
  lifeAreas: { view: LifeAreas, load: loadLifeAreas },
  shop: { view: ShopWidget, load: loadShop, actions: shopActions, bodyClass: "winx-shop" },
  supplies: { view: SuppliesWidget, load: loadSupplies, actions: suppliesActions },
  goals: { view: GoalsWidget, load: loadGoals },
  savings: { view: SavingsJars, load: loadSavings, actions: savingsActions },
  cycle: { view: CycleWidget, load: loadCycle, actions: cycleActions },
  finance: { view: FinanceMonths, load: loadFinance },
  financeMonth: { view: FinanceLine, load: loadFinanceLine },
  weight: { view: WeightCard, load: loadWeight, actions: weightActions },
  celestialMarket: {
    view: CelestialMarket, load: loadCelestialMarket, actions: celestialMarketActions, cardButton: CelestialMarketAdd,
  },
};

// a Vue widget on its block: a VueHost (with the card when the block has a "card:" line) owned by the block
function vueBlock(def, el, sourcePath, args) {
  const ctx = { get dv() { return blockDv(sourcePath, el); }, app, args, sourcePath };
  const meta = args.meta ? String(args.meta).split(/\s+/) : [];
  const card = args.card ? { title: String(args.card), meta, bodyClass: def.bodyClass } : undefined;
  if (!card && def.bodyClass) el.addClass(def.bodyClass);   // no card: the class goes on the block itself
  const block = new MarkdownRenderChild(el);
  const load = () => def.load(ctx), actions = def.actions?.(ctx);
  const { cardButton, follows } = def;
  block.addChild(new VueHost(el, def.view, { load, actions, note: sourcePath, card, cardButton, follows }));
  return block;
}

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  if (vueBlocks[name]) return void ctx.addChild(vueBlock(vueBlocks[name], el, ctx.sourcePath, args));
  const Widget = blocks[name];
  if (!Widget) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(new Widget(el, ctx.sourcePath, args));
};
