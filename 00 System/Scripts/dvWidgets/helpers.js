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

    const goldByTag = Object.fromEntries(config.difficulties.map(d => [d.tag, d.gold]));
    let earned = 0;

    for (const page of dv.pages('"02 Areas/Personal/Tasks"')) {
      for (const task of page.file.tasks) {
        if (!task.completed) continue;
        for (const [tag, gold] of Object.entries(goldByTag)) {
          if (task.text.includes(tag)) { earned += gold; break; }
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
      const content = await app.vault.read(file);
      await app.vault.modify(file, `${content.replace(/\s+$/, "")}\n${line}\n`);
    }

    Wallet.invalidate("spent");
  }
}

// ===== ONE-TIME EVENT SUBSCRIPTION =====
// Invalidate caches when relevant files change. Survives re-evals via globalThis flag.
if (!globalThis.app.__winxWalletSub) {
  globalThis.app.__winxWalletSub = true;
  app.metadataCache.on("changed", (file) => {
    if (file.path.startsWith("02 Areas/Personal/Tasks")) Wallet.invalidate("earned");
    else if (file.path.startsWith("00 System/Data/Purchases")) Wallet.invalidate("spent");
  });
}

({ AudioEngine, Wallet, PurchaseLog })
