// Areas, difficulties, XP and gold, levels, market categories: the numbers the widgets share.
// The defaults are below; 00 System/Data/config.json (the ⚙ Settings window) overrides the
// difficulties' XP and gold, the areas, XP Today's thresholds and the level cost: applyConfig,
// called by the task store whenever the file is read. A task's record names its difficulty and
// area by `key`.
const DIFFICULTIES = [
  { label: "⭐ Easy", key: "easy", xp: 5, gold: 2 },
  { label: "⭐⭐ Medium", key: "medium", xp: 10, gold: 5 },
  { label: "⭐⭐⭐ Hard", key: "hard", xp: 20, gold: 10 },
  { label: "⭐⭐⭐⭐ Epic", key: "epic", xp: 50, gold: 25 },
];

// an area: its key (in the records), icon, title, the Life Areas radar's name, its colour (the
// calendar's stripe and balance bar)
const AREAS = [
  { key: "body", icon: "🌺", title: "Body", name: "Vitality", color: "#e8609a" },
  { key: "mind", icon: "🔮", title: "Mind", name: "Knowledge", color: "#9b6bd6" },
  { key: "wealth", icon: "💎", title: "Wealth", name: "Resources", color: "#e0a12e" },
  { key: "base", icon: "🏰", title: "Base", name: "Sanctuary", color: "#4fb59a" },
  { key: "occasions", icon: "🌠", title: "Occasions", name: "Memory", color: "#f08a5d" },
  { key: "rest", icon: "🌙", title: "Rest", name: "Serenity", color: "#6aa6e0" },
];

// XP Today's aura: up to `spark` XP a day SPARK, up to `glow` GLOW, up to `aura` AURA, above it
// TRANSFORMATION; a level costs base + (n - 1) × step XP
const LEVELS = { spark: 10, glow: 20, aura: 30 };
const LEVEL_COST = { base: 100, step: 25 };

// filled by applyConfig below
const config = {
  difficulties: [], areas: [], levels: [], levelCost: { base: 0, step: 0 },
  xpMap: {}, areaMap: {}, areaIcons: {}, areaColors: {},
  marketCategories: [
    { label: "🌿 Harvest", tag: "#food" },
    { label: "🌸 Bloom", tag: "#care" },
    { label: "🐾 Familiar", tag: "#pet" },
    { label: "🏰 Sanctuary", tag: "#home" },
    { label: "✨ Vitality", tag: "#health" },
  ],
};

const num = (v, fallback) => typeof v === "number" && Number.isFinite(v) ? v : fallback;

// config.json's values over the defaults (a key it doesn't have: the default), and the maps the
// widgets read worked out again; {} puts the defaults back
export function applyConfig(json = {}) {
  const d = json.difficulties ?? {};
  const areas = Array.isArray(json.areas) && json.areas.length ? json.areas : AREAS;
  const lv = { ...LEVELS, ...json.levels }, cost = { ...LEVEL_COST, ...json.levelCost };

  config.difficulties = DIFFICULTIES.map(x =>
    ({ ...x, xp: num(d[x.key]?.xp, x.xp), gold: num(d[x.key]?.gold, x.gold) }));
  config.areas = areas.map(a => ({
    key: String(a.key), icon: a.icon ?? "✦", title: a.title ?? String(a.key),
    name: a.name ?? a.title,
    color: a.color ?? null, label: `${a.icon ?? "✦"} ${a.title ?? a.key}`,
  }));
  config.levels = [
    { name: "VOID", max: 0, cls: "v0" },
    { name: "SPARK", max: num(lv.spark, LEVELS.spark), cls: "v1" },
    { name: "GLOW", max: num(lv.glow, LEVELS.glow), cls: "v2" },
    { name: "AURA", max: num(lv.aura, LEVELS.aura), cls: "v3" },
    { name: "TRANSFORMATION", max: Infinity, cls: "v4" },
  ];
  config.levelCost = {
    // Non-positive costs can leave levelInfo subtracting zero or a negative number forever.
    base: cost.base > 0 ? num(cost.base, LEVEL_COST.base) : LEVEL_COST.base,
    step: cost.step >= 0 ? num(cost.step, LEVEL_COST.step) : LEVEL_COST.step,
  };
  config.xpMap = Object.fromEntries(config.difficulties.map(x => [x.key, x.xp]));
  config.areaMap = Object.fromEntries(config.areas.map(a => [a.key, a.name]));
  config.areaIcons = Object.fromEntries(config.areas.map(a => [a.key, a.icon]));
  config.areaColors = Object.fromEntries(config.areas.map(a => [a.key, a.color]));
}

applyConfig();

export default config;
