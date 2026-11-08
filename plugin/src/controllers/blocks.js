// The ```winx block: the widgets by name (each a .vue on a VueHost) and what the plugin does
// with a block. A widget's writes aren't here: its .vue imports them from its controller.
import { blockDv } from "#/helpers/plugins.js";
import { app } from "#/helpers/app.js";
import { VueHost } from "#/composables/vueHost.ts";
import { loadLevelToday, loadLifeAreas, loadXpToday } from "#/controllers/widgets/xp.js";
import { loadShop } from "#/controllers/widgets/shop.js";
import { loadCelestialMarket, loadSupplies } from "#/controllers/widgets/market.js";
import { loadGoals } from "#/controllers/widgets/goals.js";
import { loadSavings } from "#/controllers/widgets/savings.js";
import { loadCycle } from "#/controllers/widgets/cycle.js";
import { loadFinance, loadFinanceLine } from "#/controllers/widgets/finance.js";
import { loadWeight } from "#/controllers/widgets/weight.js";
import {
  BODY_LOG, CYCLE, GOALS, LEDGER, MARKET, PURCHASES, RULES, SAVINGS, SHOP, TASKS, WEIGHT,
} from "#/helpers/paths.js";
import { loadDailyNote } from "#/controllers/widgets/dailyNote.js";
import { loadPomodoro } from "#/controllers/widgets/pomodoro.js";
import { loadMeds } from "#/controllers/meds.js";
// the widgets' markup: components/pages/dashboard/widgets/
import XpToday from "#/components/pages/dashboard/widgets/xp/XpToday/index.vue";
import LevelToday from "#/components/pages/dashboard/widgets/xp/LevelToday/index.vue";
import LifeAreas from "#/components/pages/dashboard/widgets/xp/LifeAreas/index.vue";
import ShopWidget from "#/components/pages/shop/index.vue";
import SuppliesWidget from "#/components/pages/supplies/index.vue";
import CelestialMarket from "#/components/pages/dashboard/widgets/market/index.vue";
import CelestialMarketAdd from "#/components/pages/dashboard/widgets/market/CelestialMarketAdd.vue";
import GoalsWidget from "#/components/pages/dashboard/widgets/goals/index.vue";
import SavingsJars from "#/components/pages/dashboard/widgets/savings/index.vue";
import CycleWidget from "#/components/pages/dashboard/widgets/cycle/index.vue";
import FinanceMonths from "#/components/pages/finance/index.vue";
import FinanceLine from "#/components/pages/dashboard/widgets/finance/index.vue";
import WeightCard from "#/components/pages/dashboard/widgets/weight/index.vue";
import DailyNoteOpen from "#/components/pages/dashboard/widgets/DailyNoteOpen.vue";
import PomodoroTimer from "#/components/pages/dashboard/widgets/pomodoro/index.vue";
// the pages on notes of their own: components/pages/<page>/
import MedsCourse from "#/components/pages/meds/index.vue";
import MedsEdit from "#/components/pages/meds/EditButton.vue";

// the widgets: name → { view: the .vue, load(ctx): its data, cardButton: a .vue next to the
// card's title, bodyClass: a class on the card's body, watches: the files it reads (a folder:
// ending in /): only their changes load it again (any other note's doesn't), follows: false to
// load once }, where ctx is { dv, app, args, sourcePath, source: the block's own text } (dv:
// blockDv)
const TASK_FILES = `${TASKS}/`, MARKET_NOTE = `${MARKET}.md`, LEDGER_FILES = `${LEDGER}/`;

export const blocks = {
  xpToday: { view: XpToday, load: loadXpToday, watches: [TASK_FILES] },
  levelToday: { view: LevelToday, load: loadLevelToday, watches: [TASK_FILES, CYCLE] },
  lifeAreas: { view: LifeAreas, load: loadLifeAreas, watches: [TASK_FILES] },
  shop: {
    view: ShopWidget, load: loadShop, bodyClass: "winx-shop",
    watches: [TASK_FILES, `${SHOP}.md`, `${PURCHASES}.md`],
  },
  supplies: { view: SuppliesWidget, load: loadSupplies, watches: [MARKET_NOTE] },
  goals: { view: GoalsWidget, load: loadGoals, watches: [`${GOALS}.md`, TASK_FILES] },
  savings: { view: SavingsJars, load: loadSavings, watches: [`${SAVINGS}/`] },
  cycle: { view: CycleWidget, load: loadCycle, watches: [CYCLE] },
  finance: { view: FinanceMonths, load: loadFinance, watches: [LEDGER_FILES, RULES] },
  financeMonth: { view: FinanceLine, load: loadFinanceLine, watches: [LEDGER_FILES, RULES] },
  // a reload keeps the typed picks
  weight: { view: WeightCard, load: loadWeight, watches: [WEIGHT, BODY_LOG, CYCLE] },
  // the tab's date only (useTabDate)
  dailyNote: { view: DailyNoteOpen, load: loadDailyNote, watches: [] },
  pomodoro: { view: PomodoroTimer, load: loadPomodoro, follows: false },
  celestialMarket: {
    view: CelestialMarket,
    load: loadCelestialMarket,
    cardButton: CelestialMarketAdd,
    watches: [MARKET_NOTE],
  },
  // a medication course's own note: its table is the block's text
  meds: { view: MedsCourse, load: loadMeds, cardButton: MedsEdit, watches: [] },
};

// a widget on its block: its VueHost, with the card when the block has a "card:" line
function block(def, el, sourcePath, args, source) {
  const ctx = { get dv() { return blockDv(sourcePath, el); }, app, args, sourcePath, source };
  const meta = args.meta ? String(args.meta).split(/\s+/) : [];
  const card = args.card ? { title: String(args.card), meta, bodyClass: def.bodyClass } : undefined;

  // no card: the class goes on the block itself
  if (!card && def.bodyClass) el.addClass(def.bodyClass);
  const { cardButton, follows, watches } = def;
  const opts = { load: () => def.load(ctx), note: sourcePath, card, cardButton, follows, watches };

  return new VueHost(el, def.view, opts);
}

// A ```winx block's text: the widget's name on the first line, then "key: value" lines (a JSON
//   value, else text); a table's lines (| …) are the block's own text, not arguments.
//   ```winx
//   weight
//   input: true
//   ```
export function parseBlock(source) {
  const [name = "", ...rest] = source.split("\n").map(l => l.trim()).filter(Boolean);
  const args = {};

  for (const line of rest) {
    const i = line.indexOf(":");

    if (i < 1 || line.startsWith("|")) continue;
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
  ctx.addChild(block(def, el, ctx.sourcePath, args, source));
};
