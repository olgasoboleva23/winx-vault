// ===== MODULE LOADING =====
// Widgets bootstrap this file once per session:
//   const H = (app.__winxHelpers ??= eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js")));
// Both caches are dropped by the vault "modify" listener below whenever a
// file under 00 System/Scripts changes, so edits hot-reload on next render.
const CONFIG_PATH = "00 System/Scripts/dvWidgets/config.js";

async function loadConfig() {
  return (globalThis.app.__winxConfig ??= eval(await app.vault.adapter.read(CONFIG_PATH)));
}

// ===== SHARED WIDGET LOGIC =====
// XP value of a task, based on its difficulty tag (0 if untagged).
const taskXp = (task, xpMap) =>
  Object.entries(xpMap).find(([tag]) => task.tags.includes(tag))?.[1] ?? 0;

// Single pass over daily notes in [start, end]:
// { habitName: { area: "#area/x", days: Set<"yyyy-MM-dd"> } }
// Tag shape is #habit/area/name, or #habit/name (area doubles as name).
function collectHabitDays(dv, start, end) {
  const habits = {};
  for (const page of dv.pages('"02 Areas/Personal/Daily Notes"')
      .where(p => p.date?.ts >= start.ts && p.date?.ts <= end.ts)) {
    const dateStr = page.date.toFormat("yyyy-MM-dd");
    for (const t of page.file.tasks) {
      const habitTag = t.tags?.find(tag => tag.startsWith("#habit/"));
      if (!habitTag || !t.completed) continue;
      const [, areaSlug, habitPart] = habitTag.split("/");
      const name = habitPart ?? areaSlug;
      (habits[name] ??= { area: `#area/${areaSlug}`, days: new Set() }).days.add(dateStr);
    }
  }
  return habits;
}

// Palette color for charts, read from the winx-tokens.css custom props so
// charts follow re-theming. Returns an rgba() string Chart.js accepts.
function chartColor(token, alpha = 1) {
  const hex = getComputedStyle(document.body).getPropertyValue(token).trim();
  const m = hex.match(/^#?([0-9a-f]{6})$/i);
  if (!m) return `rgba(150, 150, 150, ${alpha})`;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`;
}

// ===== AUDIO (shared AudioContext + buffer cache across renders) =====
const _audio = (globalThis.app.__winxAudio ??= { ctx: null, buffers: new Map() });
const _ctx   = () => _audio.ctx ??= new (window.AudioContext || window.webkitAudioContext)();

class AudioEngine {
  constructor(path) {
    this.path = path;
    if (!_audio.buffers.has(path)) {
      _audio.buffers.set(path, this.#load(path));
    }
  }

  async #load(path) {
    const file = app.metadataCache.getFirstLinkpathDest(path, "");
    if (!file) { console.warn(`AudioEngine: ${path} not found`); return null; }
    const url = app.vault.adapter.getResourcePath(file.path);
    const res = await fetch(url);
    return _ctx().decodeAudioData(await res.arrayBuffer());
  }

  async play({ rate = 1.0, gain = 0.3, duration = 1.2 } = {}) {
    const buffer = await _audio.buffers.get(this.path);
    if (!buffer) return;

    const ctx = _ctx();
    if (ctx.state === "suspended") ctx.resume();

    const src = ctx.createBufferSource();
    const g   = ctx.createGain();
    src.buffer = buffer;
    src.playbackRate.value = rate;
    src.connect(g).connect(ctx.destination);
    g.gain.setValueAtTime(gain, ctx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    src.start();
    src.stop(ctx.currentTime + duration);
  }
}

// ===== WALLET (cached earned/spent, invalidated on file change) =====
class Wallet {
  static #cache() { return globalThis.app.__winxWallet ??= { earned: null, spent: null }; }

  static invalidate(which = "all") {
    const c = globalThis.app.__winxWallet;
    if (!c) return;
    if (which === "all" || which === "earned") c.earned = null;
    if (which === "all" || which === "spent")  c.spent  = null;
  }

  static async earned(dv, config) {
    const cache = Wallet.#cache();
    if (cache.earned != null) return cache.earned;

    let earned = 0;
    for (const page of dv.pages('"02 Areas/Personal/Tasks"')) {
      for (const task of page.file.tasks) {
        if (!task.completed) continue;
        for (const d of config.difficulties) {
          if (task.tags.includes(d.tag)) { earned += d.gold; break; }
        }
      }
    }

    cache.earned = earned;
    return earned;
  }

  static async spent(dv) {
    const cache = Wallet.#cache();
    if (cache.spent != null) return cache.spent;

    let spent = 0;
    for (const page of dv.pages('"00 System/Data/Purchases"')) {
      for (const line of page.file.lists) {
        const match = line.text.match(/\|\s*(\d+)/);
        if (match) spent += Number(match[1]);
      }
    }

    cache.spent = spent;
    return spent;
  }

  static async balance(dv, config) {
    const [e, s] = await Promise.all([Wallet.earned(dv, config), Wallet.spent(dv)]);
    return e - s;
  }
}

// ===== PURCHASE LOG =====
class PurchaseLog {
  static PATH = "00 System/Data/Purchases.md";

  static async append(name, cost) {
    const date = window.moment().format("YYYY-MM-DD");
    const line = `- ${date} | ${name} | ${cost}`;
    const file = app.vault.getAbstractFileByPath(PurchaseLog.PATH);

    if (!file) {
      await app.vault.create(PurchaseLog.PATH, `# Purchases\n\n${line}\n`);
    } else {
      await app.vault.process(file, content => `${content.replace(/\s+$/, "")}\n${line}\n`);
    }

    Wallet.invalidate("spent");
  }
}

// ===== ONE-TIME EVENT SUBSCRIPTIONS =====
// Invalidate caches when relevant files change. Survives re-evals via globalThis flag.
// metadataCache "changed" only fires for markdown; script files need vault "modify".
if (!globalThis.app.__winxSub2) {
  globalThis.app.__winxSub2 = true;
  app.metadataCache.on("changed", (file) => {
    if (file.path.startsWith("02 Areas/Personal/Tasks")) Wallet.invalidate("earned");
    else if (file.path.startsWith("00 System/Data/Purchases")) Wallet.invalidate("spent");
  });
  app.vault.on("modify", (file) => {
    if (file.path.startsWith("00 System/Scripts")) {
      delete globalThis.app.__winxHelpers;
      delete globalThis.app.__winxConfig;
    }
  });
}

({ AudioEngine, Wallet, PurchaseLog, loadConfig, taskXp, collectHabitDays, chartColor })
