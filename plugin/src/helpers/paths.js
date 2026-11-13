// Where Winx keeps its notes and files: 00 System/Data (and the pictures and sounds in 00
// System/Assets), the same in every vault. Dataview takes a note's path without ".md"
// (`"${GOALS}"`), the vault with it (`${GOALS}.md`).
export const DATA = "00 System/Data";

export const TASKS = `${DATA}/Tasks`;

export const MASTER = `${TASKS}/Master.md`, POOL = `${TASKS}/Pool.md`;

// the old notes kept by the Migrate tasks command
export const MASTER_OLD = `${TASKS}/Master (old).md`, POOL_OLD = `${TASKS}/Pool (old).md`;

// Winx's part of every task (name, difficulty, area…), an object by id
export const TASK_RECORDS = `${TASKS}/tasks.json`;

// the projects (stages of task ids), an object by id, in the order of the file
export const PROJECTS = `${DATA}/Projects/projects.json`;

// the pictures (a project's cover is picked from here)
export const MEDIA = "03 Resources/Media";

export const GOALS = `${DATA}/Goals`;

export const FINANCE_PAGE = "02 Areas/Finance.md";

export const LEDGER = `${DATA}/Finance/Ledger`, RULES = `${DATA}/Finance/rules.json`;

export const SHOP = `${DATA}/Shop`, PURCHASES = `${DATA}/Purchases`;

export const MARKET = `${DATA}/Celestial Market`, SUPPLIES = `${DATA}/Supplies`;

export const MARKET_NOTE = `${MARKET}.md`;

// Market catalog and the untouched pre-migration log.
export const MARKET_RECORDS = `${DATA}/Market/items.json`;

export const MARKET_OLD = `${MARKET} (old).md`;

export const SAVINGS = `${DATA}/Savings`;

// the free journals: a note each (a level 0–3 a day and its reasons; Высыпания the first)
export const WEIGHT = `${DATA}/Weight.md`, JOURNALS = `${DATA}/Journals`;

// the food journal: the old page alias, foods with their marks and task, what was eaten a day;
// the notes they were before (Migrate food reads them)
export const FOOD = `${DATA}/Food/Food.md`, FOOD_DATA = `${DATA}/Food/food.json`;

export const FOOD_LOG = `${DATA}/Food/log.json`;

export const FOODS_NOTE = `${DATA}/Food/Foods.md`, FOOD_LOG_NOTE = `${DATA}/Food/Log.md`;

// the medication courses (an object by id), old page alias, the Base the course notes had
export const COURSES = `${DATA}/Medication/courses.json`;

export const MEDICATION = `${DATA}/Medication/Medication.md`;

export const MEDICATION_BASE = `${DATA}/Medication/_index.base`;

export const CYCLE = `${DATA}/Cycle.md`;

export const POMODORO = `${DATA}/pomodoro.json`;

export const CONFIG = `${DATA}/config.json`;

export const ASSETS = "00 System/Assets", STICKERS = `${ASSETS}/stickers`;

export const SOUNDS = `${ASSETS}/winx music`;

// the daily notes: the folder set in Obsidian's Daily notes (the vault's root when none)
export const dailyFolder = app =>
  app.internalPlugins.getPluginById("daily-notes")?.instance?.options?.folder
    ?.replace(/\/$/, "") ?? "";
