// The ```winx block: the widgets by name (each a .vue on a VueHost) and what the plugin does
// with a block.
import { parseBlock } from "#/helpers/parse.js";
import { blockDv } from "#/helpers/plugins.js";
import { app } from "#/helpers/app.js";
import { VueHost } from "#/composables/vueHost.ts";
import { loadLevelToday, loadLifeAreas, loadXpToday } from "./xp.js";
import { loadShop, shopActions } from "./shop.js";
import {
  celestialMarketActions, loadCelestialMarket, loadSupplies, suppliesActions,
} from "./market.js";
import { loadGoals } from "./goals.js";
import { loadSavings, savingsActions } from "./savings.js";
import { CYCLE_PATH, cycleActions, loadCycle } from "./cycle.js";
import { loadFinance, loadFinanceLine } from "./finance.js";
import { LOG_PATH as BODY_LOG, PATH as WEIGHT, loadWeight, weightActions } from "./weight.js";
import { dailyNoteActions, loadDailyNote } from "./dailyNote.js";
import { loadPomodoro, pomodoroActions } from "./pomodoro.js";
// the widgets' markup: components/pages/dashboard/widgets/
import XpToday from "#/components/pages/dashboard/widgets/xp/XpToday/index.vue";
import LevelToday from "#/components/pages/dashboard/widgets/xp/LevelToday/index.vue";
import LifeAreas from "#/components/pages/dashboard/widgets/xp/LifeAreas/index.vue";
import ShopWidget from "#/components/pages/dashboard/widgets/shop/ShopWidget/index.vue";
import SuppliesWidget from "#/components/pages/dashboard/widgets/market/SuppliesWidget/index.vue";
import CelestialMarket from "#/components/pages/dashboard/widgets/market/CelestialMarket/index.vue";
import CelestialMarketAdd from "#/components/pages/dashboard/widgets/market/CelestialMarketAdd.vue";
import GoalsWidget from "#/components/pages/dashboard/widgets/goals/GoalsWidget/index.vue";
import SavingsJars from "#/components/pages/dashboard/widgets/savings/SavingsJars/index.vue";
import CycleWidget from "#/components/pages/dashboard/widgets/body/CycleWidget/index.vue";
import FinanceMonths from "#/components/pages/dashboard/widgets/finance/FinanceMonths/index.vue";
import FinanceLine from "#/components/pages/dashboard/widgets/finance/FinanceLine/index.vue";
import WeightCard from "#/components/pages/dashboard/widgets/body/WeightCard/index.vue";
import DailyNoteOpen from "#/components/pages/dashboard/widgets/DailyNoteOpen.vue";
import PomodoroTimer from "#/components/pages/dashboard/widgets/pomodoro/PomodoroTimer/index.vue";

// the widgets moved to Vue: name → { view: the .vue, load(ctx): its data, actions(ctx): its writes,
// cardButton: a .vue next to the card's title, bodyClass: a class on the card's body, follows:
// false to load once }, where ctx is { dv, app, args, sourcePath } (dv: blockDv)
const vueBlocks = {
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
  weight: {
    view: WeightCard, load: loadWeight, actions: weightActions,
    watches: [WEIGHT, BODY_LOG, CYCLE_PATH],   // not every file's change: typed picks stay
  },
  dailyNote: { view: DailyNoteOpen, load: loadDailyNote, actions: dailyNoteActions },
  pomodoro: { view: PomodoroTimer, load: loadPomodoro, actions: pomodoroActions, follows: false },
  celestialMarket: {
    view: CelestialMarket,
    load: loadCelestialMarket,
    actions: celestialMarketActions,
    cardButton: CelestialMarketAdd,
  },
};

// a Vue widget on its block: its VueHost, with the card when the block has a "card:" line
function vueBlock(def, el, sourcePath, args) {
  const ctx = { get dv() { return blockDv(sourcePath, el); }, app, args, sourcePath };
  const meta = args.meta ? String(args.meta).split(/\s+/) : [];
  const card = args.card ? { title: String(args.card), meta, bodyClass: def.bodyClass } : undefined;

  // no card: the class goes on the block itself
  if (!card && def.bodyClass) el.addClass(def.bodyClass);
  const load = () => def.load(ctx), actions = def.actions?.(ctx);
  const { cardButton, follows, watches } = def;
  const opts = { load, actions, note: sourcePath, card, cardButton, follows, watches };

  return new VueHost(el, def.view, opts);
}

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  const def = vueBlocks[name];

  if (!def) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(vueBlock(def, el, ctx.sourcePath, args));
};
