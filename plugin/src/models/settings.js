// The ⚙ Settings window's values and config.json (pure; tests/settings.test.mjs): the window shows
// the config as it is now, its values go back as config.json, a few of them can't be saved, and a
// renamed area's key (☑ "apply") moves its tasks' records with it.
const KEY = /^[a-z0-9-]+$/;
const AREA = ["key", "icon", "title", "name", "color"];
const pick = a => Object.fromEntries(AREA.map(k => [k, a[k] ?? null]));

// the window's starting values from `config` (helpers/config.js): a difficulty's xp_easy /
// gold_easy, the areas (each with `was`, its key now, and ☑ apply on), XP Today's thresholds,
// the level cost
export function settingsValues(config) {
  const [, spark, glow, aura] = config.levels.map(l => l.max);

  return {
    ...Object.fromEntries(config.difficulties
      .flatMap(d => [[`xp_${d.key}`, d.xp], [`gold_${d.key}`, d.gold]])),
    areas: config.areas.map(a => ({ ...pick(a), was: a.key, apply: true })),
    spark, glow, aura, base: config.levelCost.base, step: config.levelCost.step,
  };
}

// the values as config.json
export const toConfig = v => ({
  difficulties: Object.fromEntries(Object.keys(v).filter(k => k.startsWith("xp_"))
    .map(k => k.slice(3)).map(d => [d, { xp: v[`xp_${d}`], gold: v[`gold_${d}`] }])),
  areas: v.areas.map(a => ({ ...pick(a), key: a.key.trim() })),
  levels: { spark: v.spark, glow: v.glow, aura: v.aura },
  levelCost: { base: v.base, step: v.step },
});

// why the values can't be saved, null when they can: an area taken off that still has tasks, a key
// that isn't lowercase letters, digits and "-", one key twice, XP Today's thresholds out of order
export function settingsProblem(v, records, config) {
  const keys = v.areas.map(a => (a.key ?? "").trim()), kept = new Set(v.areas.map(a => a.was));
  const bad = keys.find(k => !KEY.test(k));
  const twice = keys.find((k, i) => keys.indexOf(k) !== i);
  const recs = [...records.values()];

  if (bad !== undefined) return `the key «${bad}»: lowercase letters, digits and "-" only`;
  if (twice) return `the key «${twice}» is there twice`;
  for (const a of config.areas.filter(a => !kept.has(a.key))) {
    const n = recs.filter(r => r.area === a.key).length;

    if (n) return `«${a.title}» has ${n} tasks: move them to another area first`;
  }

  if (!(v.spark < v.glow && v.glow < v.aura)) return "XP Today: SPARK < GLOW < AURA";
  return null;
}

// the records to change for the areas whose key changed with ☑ apply: { id: { area: new key } }
export function areaMoves(v, records) {
  const to = new Map(v.areas.filter(a => a.apply && a.was && a.was !== a.key.trim())
    .map(a => [a.was, a.key.trim()]));

  return Object.fromEntries([...records].filter(([, r]) => to.has(r.area))
    .map(([id, r]) => [id, { area: to.get(r.area) }]));
}
