// Where Winx keeps its notes and files: 00 System/Data (and the pictures and sounds in 00
// System/Assets), the same in every vault. Dataview takes a note's path without ".md"
// (`"${GOALS}"`), the vault with it (`${GOALS}.md`).
export const DATA = "00 System/Data";

export const TASKS = `${DATA}/Tasks`;

export const MASTER = `${TASKS}/Master.md`, POOL = `${TASKS}/Pool.md`;

export const GOALS = `${DATA}/Goals`;

export const LEDGER = `${DATA}/Finance/Ledger`, RULES = `${DATA}/Finance/rules.json`;

export const SHOP = `${DATA}/Shop`, PURCHASES = `${DATA}/Purchases`;

export const MARKET = `${DATA}/Celestial Market`, SUPPLIES = `${DATA}/Supplies`;

export const SAVINGS = `${DATA}/Savings`;

export const WEIGHT = `${DATA}/Weight.md`, BODY_LOG = `${DATA}/Body log.md`;

export const CYCLE = `${DATA}/Cycle.md`;

export const POMODORO = `${DATA}/pomodoro.json`;

export const ASSETS = "00 System/Assets", STICKERS = `${ASSETS}/stickers`;

export const SOUNDS = `${ASSETS}/winx music`;

// the daily notes: the folder set in Obsidian's Daily notes (the vault's root when none)
export const dailyFolder = app =>
  app.internalPlugins.getPluginById("daily-notes")?.instance?.options?.folder
    ?.replace(/\/$/, "") ?? "";
