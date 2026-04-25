const difficulties = [
  { label: "⭐ Easy",       tag: "#⭐easy",      xp: 5  },
  { label: "⭐⭐ Medium",   tag: "#⭐⭐medium",   xp: 10 },
  { label: "⭐⭐⭐ Hard",   tag: "#⭐⭐⭐hard",   xp: 20 },
  { label: "⭐⭐⭐⭐ Epic", tag: "#⭐⭐⭐⭐epic", xp: 50 },
];

const areas = [
  { label: "🏃 Body",      tag: "#area/body",      name: "Vitality"   },
  { label: "💼 Work",      tag: "#area/work",      name: "Craft"      },
  { label: "🧠 Mind",      tag: "#area/mind",      name: "Knowledge"  },
  { label: "💰 Wealth",    tag: "#area/wealth",    name: "Resources"  },
  { label: "🏡 Base",      tag: "#area/base",      name: "Sanctuary"  },
  { label: "🌄 Occasions",    tag: "#area/occasions",    name: "Memory"     },
  { label: "🌙 Rest", tag: "#area/rest", name: "Serenity" }
];

({
  // raw arrays — for QuickAdd suggester
  difficulties,
  areas,

  // derived maps — ready to use in widgets
  xpMap:   Object.fromEntries(difficulties.map(d => [d.tag, d.xp])),
  areaMap: Object.fromEntries(areas.map(a => [a.tag, a.name])),

  levels: [
    { name: "VOID",           max: 0,        cls: "v0" },
    { name: "SPARK",          max: 10,       cls: "v1" },
    { name: "GLOW",           max: 20,       cls: "v2" },
    { name: "AURA",           max: 30,       cls: "v3" },
    { name: "TRANSFORMATION", max: Infinity, cls: "v4" },
  ],

  HABIT_BONUS_XP:        100,
  HABIT_BONUS_THRESHOLD: 30,
})
