// Where Winx keeps its notes: 00 System/Data, the same in every vault. Dataview takes a note's path without
// ".md" (`"${GOALS}"`), the vault with it (`${GOALS}.md`).
export const DATA = "00 System/Data";
export const TASKS = `${DATA}/Tasks`;
export const MASTER = `${TASKS}/Master.md`, POOL = `${TASKS}/Pool.md`;
export const GOALS = `${DATA}/Goals`;
export const LEDGER = `${DATA}/Finance/Ledger`, RULES = `${DATA}/Finance/rules.json`;

// the daily notes: the folder set in Obsidian's Daily notes (the vault's root when none)
export const dailyFolder = app =>
  app.internalPlugins.getPluginById("daily-notes")?.instance?.options?.folder?.replace(/\/$/, "") ?? "";
