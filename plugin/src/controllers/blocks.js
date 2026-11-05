// The ```winx block: the widgets by name (each a .vue on a VueHost) and what the plugin does
// with a block.
import { blockDv } from "#/helpers/plugins.js";
import { app } from "#/helpers/app.js";
import { VueHost } from "#/composables/vueHost.ts";
import { loadLevelToday, loadLifeAreas, loadXpToday } from "#/controllers/widgets/xp.js";
import { loadShop, shopActions } from "#/controllers/widgets/shop.js";
import {
  celestialMarketActions, loadCelestialMarket, loadSupplies, suppliesActions,
} from "#/controllers/widgets/market.js";
import { loadGoals } from "#/controllers/widgets/goals.js";
import { loadSavings, savingsActions } from "#/controllers/widgets/savings.js";
import { CYCLE_PATH, cycleActions, loadCycle } from "#/controllers/widgets/cycle.js";
import { loadFinance, loadFinanceLine } from "#/controllers/widgets/finance.js";
import {
  LOG_PATH as BODY_LOG, PATH as WEIGHT, loadWeight, weightActions,
} from "#/controllers/widgets/weight.js";
import { dailyNoteActions, loadDailyNote } from "#/controllers/widgets/dailyNote.js";
import { loadPomodoro, pomodoroActions } from "#/controllers/widgets/pomodoro.js";
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

// the widgets: name → { view: the .vue, load(ctx): its data, actions(ctx): its writes,
// cardButton: a .vue next to the card's title, bodyClass: a class on the card's body, follows:
// false to load once }, where ctx is { dv, app, args, sourcePath } (dv: blockDv)
const blocks = {
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

// a widget on its block: its VueHost, with the card when the block has a "card:" line
function block(def, el, sourcePath, args) {
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

// A ```winx block's text: the widget's name on the first line, then "key: value" lines (a JSON
//   value, else text).
//   ```winx
//   weight
//   input: true
//   ```
export function parseBlock(source) {
  const [name = "", ...rest] = source.split("\n").map(l => l.trim()).filter(Boolean);
  const args = {};

  for (const line of rest) {
    const i = line.indexOf(":");

    if (i < 1) continue;
    const value = line.slice(i + 1).trim();

    const key = line.slice(0, i).trim();

    try { args[key] = JSON.parse(value); } catch { args[key] = value; }
  }

  return { name, args };
}

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  const def = blocks[name];

  if (!def) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(block(def, el, ctx.sourcePath, args));
};
