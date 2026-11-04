// The ```winx block: the widget classes by name, and what the plugin does with a block.
import { parseBlock } from "./parse.js";
import { CelestialMarket } from "./market/celestialMarket.js";
import { Cycle } from "./body/cycle.js";
import { DailyNote } from "./dailyNote.js";
import { Finance, FinanceMonth } from "./finance/finance.js";
import { Goals } from "./goals/goals.js";
import { LifeAreas } from "./xp/lifeAreas.js";
import { LevelToday } from "./xp/levelToday.js";
import { Savings } from "./savings/savings.js";
import { Pomodoro } from "./pomodoro/pomodoro.js";
import { Shop } from "./shop/shop.js";
import { Supplies } from "./market/supplies.js";
import { Weight } from "./body/weight.js";
import { loadXpToday } from "./xp/xpToday.js";
import XpToday from "./xp/XpToday.vue";
import { MarkdownRenderChild } from "obsidian";
import { VueHost } from "../core/vueHost.ts";
import { blockDv } from "../core/plugins.js";
import { app } from "../core/app.js";

// name → class
export const blocks = {
  celestialMarket: CelestialMarket, cycle: Cycle, dailyNote: DailyNote, finance: Finance, financeMonth: FinanceMonth,
  goals: Goals, levelToday: LevelToday, lifeAreas: LifeAreas, pomodoro: Pomodoro, savings: Savings, shop: Shop,
  supplies: Supplies, weight: Weight,
};

// the widgets moved to Vue: name → { view: the .vue, load(ctx): its data, actions(ctx): its writes }, where ctx is
// { dv, app, args, sourcePath } (dv: blockDv)
export const vueBlocks = {
  xpToday: { view: XpToday, load: loadXpToday },
};

// a Vue widget on its block: a VueHost (with the card when the block has a "card:" line) owned by the block
function vueBlock(def, el, sourcePath, args) {
  const ctx = { get dv() { return blockDv(sourcePath, el); }, app, args, sourcePath };
  const meta = args.meta ? String(args.meta).split(/\s+/) : [];
  const card = args.card ? { title: String(args.card), meta } : undefined;
  const block = new MarkdownRenderChild(el);
  const load = () => def.load(ctx), actions = def.actions?.(ctx);
  block.addChild(new VueHost(el, def.view, { load, actions, note: sourcePath, card }));
  return block;
}

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  if (vueBlocks[name]) return void ctx.addChild(vueBlock(vueBlocks[name], el, ctx.sourcePath, args));
  const Widget = blocks[name];
  if (!Widget) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(new Widget(el, ctx.sourcePath, args));
};
