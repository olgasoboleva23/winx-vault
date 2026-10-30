// The ```winx block: the widget classes by name, and what the plugin does with a block.
import { parseBlock } from "./parse.js";
import { Cycle } from "./cycle.js";
import { DailyNote } from "./dailyNote.js";
import { Habits } from "./habits.js";
import { LevelToday } from "./levelToday.js";
import { MobileHome } from "./mobileHome.js";
import { Supplies } from "./supplies.js";
import { Wallet } from "./wallet.js";

// name → class; each widget adds itself here as it moves to a class
export const blocks = { cycle: Cycle, dailyNote: DailyNote, habits: Habits, levelToday: LevelToday, mobileHome: MobileHome, supplies: Supplies, wallet: Wallet };

export const drawBlock = (source, el, ctx) => {
  const { name, args } = parseBlock(source);
  const Widget = blocks[name];
  if (!Widget) return void el.createDiv({ text: `winx: no widget "${name}"` });
  ctx.addChild(new Widget(el, ctx.sourcePath, args));
};
