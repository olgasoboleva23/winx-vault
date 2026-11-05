// The ```winx block: the widgets by name (each a .vue on a VueHost) and what the plugin does
// with a block.
import { parseBlock } from "./parse.js";
import { loadXpToday } from "./xp/xpToday.js";
import XpToday from "../components/widgets/xp/XpToday.vue";
import { loadLevelToday } from "./xp/levelToday.js";
import LevelToday from "../components/widgets/xp/LevelToday.vue";
import { loadLifeAreas } from "./xp/lifeAreas.js";
import LifeAreas from "../components/widgets/xp/LifeAreas.vue";
import { loadShop } from "./shop/shop.js";
import { shopActions } from "../controllers/shop.js";
import ShopWidget from "../components/widgets/shop/ShopWidget.vue";
import { loadSupplies } from "./market/supplies.js";
import SuppliesWidget from "../components/widgets/market/SuppliesWidget.vue";
import { loadCelestialMarket } from "./market/celestialMarket.js";
import { celestialMarketActions, suppliesActions } from "../controllers/market.js";
import CelestialMarket from "../components/widgets/market/CelestialMarket.vue";
import CelestialMarketAdd from "../components/widgets/market/CelestialMarketAdd.vue";
import { loadGoals } from "./goals/goals.js";
import GoalsWidget from "../components/widgets/goals/GoalsWidget.vue";
import { loadSavings } from "./savings/savings.js";
import { savingsActions } from "../controllers/savings.js";
import SavingsJars from "../components/widgets/savings/SavingsJars.vue";
import { CYCLE_PATH, loadCycle } from "./body/cycle.js";
import { cycleActions } from "../controllers/cycle.js";
import CycleWidget from "../components/widgets/body/CycleWidget/index.vue";
import { loadFinance, loadFinanceLine } from "./finance/finance.js";
import FinanceMonths from "../components/widgets/finance/FinanceMonths/index.vue";
import FinanceLine from "../components/widgets/finance/FinanceLine.vue";
import { LOG_PATH as BODY_LOG, PATH as WEIGHT, loadWeight } from "./body/weight.js";
import { weightActions } from "../controllers/weight.js";
import WeightCard from "../components/widgets/body/WeightCard/index.vue";
import { loadDailyNote } from "./dailyNote.js";
import { dailyNoteActions } from "../controllers/dailyNote.js";
import DailyNoteOpen from "../components/widgets/DailyNoteOpen.vue";
import { loadPomodoro } from "./pomodoro/pomodoro.js";
import { pomodoroActions } from "../controllers/pomodoro.js";
import PomodoroTimer from "../components/widgets/pomodoro/PomodoroTimer/index.vue";
import { VueHost } from "../core/vueHost.ts";
import { blockDv } from "../core/plugins.js";
import { app } from "../core/app.js";


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
