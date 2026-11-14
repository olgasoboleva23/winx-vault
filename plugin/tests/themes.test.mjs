import { after, test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { Component } from "obsidian";
import * as sass from "sass";
import postcss from "postcss";
import config, { applyConfig, THEMES } from "#/helpers/config.js";
import { settingsValues, toConfig } from "#/models/settings.js";
import { useTheme } from "#/controllers/theme.js";
import { useTaskStore, taskStore } from "#/store/tasks.js";
import { setApp } from "#/helpers/app.js";
import { CONFIG, THEME_IMAGES } from "#/helpers/paths.js";
import { chartColor } from "#/helpers/chart.js";

GlobalRegistrator.register();
after(() => { applyConfig(); GlobalRegistrator.unregister(); });
const settle = () => new Promise(r => setTimeout(r, 5));

test("theme follows loaded/synced settings, late images, reset and plugin unload", async () => {
  const files = { [CONFIG]: JSON.stringify({ theme: "gothic" }) };
  const events = new Map(), draws = [], plugin = new Component();
  const on = (name, fn) => {
    const listeners = events.get(name) ?? new Set();
    events.set(name, listeners); listeners.add(fn);
    return { off: () => listeners.delete(fn) };
  };
  const fire = (name, ...args) => events.get(name)?.forEach(fn => fn(...args));
  plugin.app = {
    metadataCache: { on },
    vault: {
      on, getFileByPath: path => path in files ? { path } : null,
      cachedRead: async f => files[f.path], getResourcePath: f => `app://vault/${f.path}`,
    },
    workspace: { layoutReady: true, trigger: event => draws.push(event) },
  };
  setApp(plugin.app);
  applyConfig();
  useTaskStore(plugin); useTheme(plugin); await settle();
  assert.equal(config.theme, "gothic");
  assert.ok(document.body.classList.contains("winx-theme-gothic"));
  assert.equal(document.body.style.getPropertyValue("--winx-theme-image"), "none");
  const image = `${THEME_IMAGES}/gothic.avif`;
  files[image] = "image"; fire("create", { path: image });
  assert.match(document.body.style.getPropertyValue("--winx-theme-image"), /gothic\.avif/);

  for (const { value } of THEMES) {
    const json = toConfig({ ...settingsValues(config), theme: value });
    assert.equal(json.theme, value);
    assert.equal(json.levelCost.base, 100);
    files[CONFIG] = JSON.stringify(json); fire("modify", { path: CONFIG }); await settle();
    assert.equal(config.theme, value);
    assert.equal(document.body.classList.contains(`winx-theme-${value}`), value !== "winx");
  }
  files[CONFIG] = '{"theme":"missing"}'; fire("modify", { path: CONFIG }); await settle();
  assert.equal(config.theme, "winx");
  assert.equal(document.body.style.getPropertyValue("--winx-theme-image"), "");
  files[CONFIG] = '{"theme":"winx-dark"}'; fire("modify", { path: CONFIG }); await settle();
  assert.ok(draws.includes("winx:theme"));
  plugin.unload();
  assert.equal(document.body.className, "");
  assert.equal(document.body.style.getPropertyValue("--winx-theme-image"), "");
  const count = draws.length;
  taskStore.version.value++; fire("create", { path: image });
  assert.equal(draws.length, count);
});

test("each theme defines the palette in Winx only and ships its AVIF and heading font", () => {
  const styles = new URL("../src/styles/", import.meta.url).pathname;
  const defaults = postcss.parse(sass.compile(`${styles}_tokens.scss`).css);
  const required = new Set();
  defaults.walkDecls(d => required.add(d.prop));
  const themes = postcss.parse(sass.compile(`${styles}_themes.scss`).css);
  const fonts = readFileSync(`${styles}_fonts.scss`, "utf8");
  const expected = { "winx-dark": "Cinzel", gothic: "Pirata One", da2: "Cinzel Decorative" };
  for (const [name, font] of Object.entries(expected)) {
    const rule = themes.nodes.find(r => r.selector?.startsWith(`body.winx-theme-${name} `));
    assert.ok(rule.selector.includes('.workspace-leaf-content[data-type=winx]'));
    assert.ok(rule.selector.includes('.block-language-winx'));
    const declarations = new Map(rule.nodes.map(d => [d.prop, d.value]));
    for (const token of required) assert.ok(declarations.has(token), `${name}: ${token}`);
    assert.equal(declarations.get("--winx-font-deco"), `"${font}"`);
    assert.ok(fonts.includes(`font-family: ${font};`) || fonts.includes(`font-family: "${font}";`));
    assert.ok(existsSync(new URL(`../../00 System/Assets/themes/${name}.avif`, import.meta.url)));
  }
});

test("chart colors come from the Winx container instead of Obsidian's palette", () => {
  const root = document.createElement("div");
  root.className = "workspace-leaf-content"; root.dataset.type = "winx";
  root.style.setProperty("--winx-pink-deep", "#f4a6c8");
  document.body.style.setProperty("--winx-pink-deep", "#d878a8");
  document.body.append(root);
  assert.equal(chartColor("--winx-pink-deep", 0.3), "rgba(244, 166, 200, 0.3)");
  root.style.setProperty("--winx-pink-deep", "#a3201f");
  assert.equal(chartColor("--winx-pink-deep"), "rgba(163, 32, 31, 1)");
  root.remove(); document.body.style.removeProperty("--winx-pink-deep");
});

test("theme XP names follow the same custom thresholds and survive settings round trips", () => {
  const expected = {
    winx: ["VOID", "SPARK", "GLOW", "AURA", "TRANSFORMATION"],
    "winx-dark": ["VOID", "SPARK", "GLOW", "AURA", "TRANSFORMATION"],
    gothic: ["Затишье", "Искра", "Поток", "Разряд", "Буря"],
    da2: ["Покой", "Пробуждение", "Пламя", "Сияние", "Справедливость"],
  };
  try {
    for (const [theme, names] of Object.entries(expected)) {
      applyConfig({ theme, levels: { spark: 12, glow: 24, aura: 36 } });
      assert.deepEqual(config.levels.map(l => l.name), names);
      assert.deepEqual(config.levels.map(l => l.max), [0, 12, 24, 36, Infinity]);
      assert.equal(config.levels.find(l => 25 <= l.max).name, names[3]);
      const saved = toConfig(settingsValues(config));
      assert.deepEqual(saved.levels, { spark: 12, glow: 24, aura: 36 });
      applyConfig(saved);
      assert.deepEqual(config.levels.map(l => l.name), names);
    }
  } finally { applyConfig(); }
});
