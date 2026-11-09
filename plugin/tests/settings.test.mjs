import { test } from "node:test";
import assert from "node:assert/strict";
import config, { applyConfig } from "#/helpers/config.js";
import { settingsValues, settingsProblem, toConfig, areaMoves } from "#/models/settings.js";

test("applyConfig: config.json's numbers over the defaults, the maps again; {} puts the defaults back", () => {
  applyConfig({ difficulties: { easy: { xp: 7 } }, levels: { glow: 40 }, levelCost: { step: 50 },
    areas: [{ key: "home", icon: "🏠", title: "Home", name: "Hearth", color: "#123456" }] });
  assert.equal(config.xpMap.easy, 7);
  assert.equal(config.difficulties[0].gold, 2);   // not in the file: the default
  assert.deepEqual(config.levels.map(l => l.max), [0, 10, 40, 30, Infinity]);
  assert.deepEqual(config.levelCost, { base: 100, step: 50 });
  assert.deepEqual(config.areas, [{ key: "home", icon: "🏠", title: "Home", name: "Hearth", color: "#123456", label: "🏠 Home" }]);
  assert.deepEqual([config.areaMap, config.areaIcons, config.areaColors], [{ home: "Hearth" }, { home: "🏠" }, { home: "#123456" }]);
  applyConfig({});
  assert.equal(config.xpMap.easy, 5);
  assert.deepEqual(config.areas.map(a => a.key), ["body", "mind", "wealth", "base", "occasions", "rest"]);
});

test("the window's values and back: config.json as the window left it", () => {
  applyConfig({});
  const v = settingsValues(config);
  assert.equal(v.xp_medium, 10);
  assert.deepEqual(v.areas[0], { key: "body", icon: "🌺", title: "Body", name: "Vitality", color: "#e8609a", was: "body", apply: true });
  const json = toConfig({ ...v, xp_medium: 12, glow: 35 });
  assert.deepEqual(json.difficulties.medium, { xp: 12, gold: 5 });
  assert.deepEqual(json.levels, { spark: 10, glow: 35, aura: 30 });
  assert.deepEqual(json.areas[0], { key: "body", icon: "🌺", title: "Body", name: "Vitality", color: "#e8609a" });
});

test("what the window can't save: an area with tasks taken off, a bad or doubled key, thresholds out of order", () => {
  applyConfig({});
  const v = settingsValues(config), records = new Map([["t1", { area: "base" }], ["t2", { area: "base" }]]);
  assert.equal(settingsProblem(v, records, config), null);
  assert.match(settingsProblem({ ...v, areas: v.areas.filter(a => a.key !== "base") }, records, config), /Base.*2 tasks/);
  assert.match(settingsProblem({ ...v, areas: [...v.areas, { key: "body", icon: "x", title: "X" }] }, records, config), /body.*twice/);
  assert.match(settingsProblem({ ...v, areas: [...v.areas, { key: "My Area", icon: "x", title: "X" }] }, records, config), /My Area/);
  assert.match(settingsProblem({ ...v, glow: 5 }, records, config), /SPARK.*GLOW.*AURA/);
});

test("a key changed with ☑ moves its tasks' records; without ☑ they stay", () => {
  applyConfig({});
  const v = settingsValues(config), records = new Map([["t1", { area: "base" }], ["t2", { area: "body" }], ["t3", { area: "base" }]]);
  const areas = v.areas.map(a => a.key === "base" ? { ...a, key: "home" } : a);
  assert.deepEqual(areaMoves({ ...v, areas }, records), { t1: { area: "home" }, t3: { area: "home" } });
  assert.deepEqual(areaMoves({ ...v, areas: areas.map(a => ({ ...a, apply: false })) }, records), {});
});
