// Areas, difficulties, XP and gold, levels, market categories: the numbers the widgets share. A
// task's record names its difficulty and area by `key`.
const difficulties = [
  { label: "⭐ Easy", key: "easy", xp: 5, gold: 2 },
  { label: "⭐⭐ Medium", key: "medium", xp: 10, gold: 5 },
  { label: "⭐⭐⭐ Hard", key: "hard", xp: 20, gold: 10 },
  { label: "⭐⭐⭐⭐ Epic", key: "epic", xp: 50, gold: 25 },
];

const areas = [
  { label: "🌺 Body", key: "body", name: "Vitality" },
  { label: "🔮 Mind", key: "mind", name: "Knowledge" },
  { label: "💎 Wealth", key: "wealth", name: "Resources" },
  { label: "🏰 Base", key: "base", name: "Sanctuary" },
  { label: "🌠 Occasions", key: "occasions", name: "Memory" },
  { label: "🌙 Rest", key: "rest", name: "Serenity" },
];


export default {
  // raw arrays
  difficulties,
  areas,

  // derived maps — ready to use in widgets
  xpMap: Object.fromEntries(difficulties.map((d) => [d.key, d.xp])),
  areaMap: Object.fromEntries(areas.map((a) => [a.key, a.name])),
  // icon per area key, incl. areas without a Life Areas row
  areaIcons: {
    ...Object.fromEntries(areas.map((a) => [a.key, a.label.split(" ")[0]])),
    learning: "📜", work: "🪄", personal: "🦋", health: "🧪",
  },

  levels: [
    { name: "VOID", max: 0, cls: "v0" },
    { name: "SPARK", max: 10, cls: "v1" },
    { name: "GLOW", max: 20, cls: "v2" },
    { name: "AURA", max: 30, cls: "v3" },
    { name: "TRANSFORMATION", max: Infinity, cls: "v4" },
  ],

  marketCategories: [
    { label: "🌿 Harvest", tag: "#food" },
    { label: "🌸 Bloom", tag: "#care" },
    { label: "🐾 Familiar", tag: "#pet" },
    { label: "🏰 Sanctuary", tag: "#home" },
    { label: "✨ Vitality", tag: "#health" },
  ],
};
