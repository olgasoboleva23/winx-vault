// Shared widget logic: dates, task line edits, the task window, wallet, purchases, market, sounds.
import config from "./config.js";
import { Form } from "../ui/form.ts";

async function loadConfig() { return config; }

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
    const dateStr = ymd(page.date);
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
const _audio = { ctx: null, buffers: new Map() };
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

// ===== SOUNDS (ticking a task anywhere; muted via the board's 🔊 button) =====
const isMuted = () => app.loadLocalStorage("winx-mute") === "1";
// The plugin installs them on load (`plugin` removes the listener on unload); widgets calling it again do nothing.
let soundsOn = false;
function installSounds(plugin) {
  if (soundsOn || !plugin) return;
  soundsOn = true;
  const gems   = [1, 2, 3, 4, 5, 6].map(n => new AudioEngine(`00 System/Assets/winx music/snd_pickup_gem0${n}.wav`));
  const flower = new AudioEngine("00 System/Assets/winx music/snd_pickup_dragon_flower.wav");
  // capture phase: the checkbox already shows its new state, before Tasks re-renders it
  plugin.register(() => { soundsOn = false; });
  plugin.registerDomEvent(document, "click", e => {
    const box = e.target.closest?.("input.task-list-item-checkbox");
    if (!box || isMuted()) return;
    if (!box.checked) return gems[0].play({ rate: 0.6, gain: 0.2 });   // unticked: the same gem, slowed down
    const goal = (box.closest("li")?.textContent ?? "").includes("#goal/");
    (goal ? flower : gems[Math.floor(Math.random() * gems.length)]).play({ gain: 0.25 });
  }, true);
}

// ===== DATES =====
// today as "YYYY-MM-DD"; a Dataview (Luxon) date the same way (undefined stays undefined);
// the day a page is about: its `date` property, else today (Luxon, for .minus/.plus)
const today   = () => window.moment().format("YYYY-MM-DD");
const ymd     = d => d?.toFormat("yyyy-MM-dd");
const pageDay = dv => dv.current().date ?? dv.date("today");

// ===== TASK LINES =====
// Rewrite a Dataview task's line in its file (fn returns the new line, null deletes it),
// only if that line is still the same task (Task is the class from task.js, passed in by the widget).
const editTaskLine = (t, fn, Task) => app.vault.process(app.vault.getAbstractFileByPath(t.path), c => {
  const lines = c.split("\n");
  if (Task.keyOf(lines[t.line] ?? "") !== Task.keyOf(t.text)) return c;
  const next = fn(lines[t.line]);
  next === null ? lines.splice(t.line, 1) : (lines[t.line] = next);
  return lines.join("\n");
});

// What the Tasks modal doesn't ask: difficulty, area, time of day, sticker (from 00 System/Assets/stickers);
// `preset` (Task#picks) has the current ones. A new task must have a difficulty and an area (`required`) and can
// go to the pool instead (a "to pool" checkbox: pick.pool). Resolves to the picks, null when closed.
const taskWindow = async (preset = {}, required = false) => {
  const { difficulties, areas } = await loadConfig();
  const stickers = (app.vault.getFolderByPath("00 System/Assets/stickers")?.children ?? []).sort((a, b) => a.name.localeCompare(b.name));
  return Form.ask(app, required ? "✦ New task" : "✦ Edit task", [
    { name: "Difficulty", key: "difficulty", options: difficulties.map(d => ({ label: `${d.label} (${d.xp} XP)`, value: d.tag })) },
    { name: "Area", key: "area", options: areas.map(a => ({ label: a.label, value: a.tag })) },
    // a routine's time of day: the calendar groups its 🔁 box by it
    { name: "Time of day", key: "time", options: [{ label: "—", value: null }, { label: "🌅 morning", value: "#time/morning" }, { label: "🌙 evening", value: "#time/evening" }] },
    { name: "Sticker", key: "sticker", options: [{ label: "—", value: null }, ...stickers.map(f => ({ label: f.name, value: f.name, img: f }))] },
    // Pool.md: tasks to pick when it's time (the calendar's Pool tab); no dates
    ...(required ? [{ name: "To pool", key: "pool", check: "pick it from the calendar's Pool tab when it's time" }] : []),
  ], { values: { difficulty: null, area: null, time: null, sticker: null, ...preset }, required: required ? ["difficulty", "area"] : [] });
};

// Edit a task: the task window, then the Tasks plugin's own edit dialog (text, dates; works on the phone).
// Cancelling either changes nothing. A pool line (t.pool) goes through the dialog as a task and comes back
// as a pool line (any dates set there are dropped).
const editTaskModal = async (t, Task) => {
  const api  = app.plugins.plugins["obsidian-tasks-plugin"]?.apiV1;
  const line = (await app.vault.cachedRead(app.vault.getAbstractFileByPath(t.path))).split("\n")[t.line];
  if (!api || Task.keyOf(line ?? "") !== Task.keyOf(t.text)) return;
  const was  = new Task(line).picks;
  const pick = await taskWindow(was);
  if (!pick) return;
  // the picks go in first, so the Tasks dialog shows them; nothing is written until it saves
  const changed = Object.fromEntries(Object.entries(pick).filter(([k, v]) => v !== was[k]));
  const asTask = t.pool ? line.replace(/^(\s*)- /, "$1- [ ] ") : line;
  const edited = await api.editTaskLineModal(new Task(asTask).withPicks(changed));   // "" when cancelled
  const next = edited && (t.pool ? new Task(edited).poolLine : edited);
  if (next && next !== line) await editTaskLine(t, () => next, Task);
};

// Change a task's line like editTaskLine (fn may return several lines, or null to delete), then show
// a notice "<mark> <task>  undo" for 8 s; undo puts the old line back if the new lines are still there.
const editTaskLineWithUndo = async (t, fn, Task, mark) => {
  let before = null, after = null;
  await editTaskLine(t, line => { before = line; return after = fn(line); }, Task);
  if (before === null) return;
  const added = after === null ? [] : after.split("\n");
  const frag  = document.createDocumentFragment();
  frag.append(`${mark} ${new Task(before).text.slice(0, 40)}  `);
  const undo = frag.appendChild(document.createElement("button"));
  undo.textContent = "undo";
  undo.onclick = () => app.vault.process(app.vault.getAbstractFileByPath(t.path), c => {
    const lines = c.split("\n");
    if (lines.slice(t.line, t.line + added.length).join("\n") !== added.join("\n")) return c;   // changed since
    lines.splice(Math.min(t.line, lines.length), added.length, before);
    return lines.join("\n");
  });
  new Notice(frag, 8000);
};
const deleteTaskLine = (t, Task) => editTaskLineWithUndo(t, () => null, Task, "🗑");

// ===== WALLET (cached earned/spent, invalidated on file change) =====
class Wallet {
  static #sums = { earned: null, spent: null };
  static #cache() { return Wallet.#sums; }

  static invalidate(which = "all") {
    const c = Wallet.#sums;
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
    const date = today();
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

// ===== CELESTIAL MARKET =====
const MARKET_PATH = "00 System/Data/Celestial Market.md";
const marketName  = t => t.text.replace(/#[\w/]+/g, "").replace(/[✅📅⏳🛫➕🔁].*$/u, "").trim();
const marketTag   = t => t.tags?.find(tag => !tag.includes("/")) ?? "#other";

// { history: [{name, tag, date}] of bought items, open: Set of lowercased names still on the list }
function marketState(dv) {
  const tasks = dv.page(MARKET_PATH)?.file.tasks.array() ?? [];
  return {
    history: tasks.filter(t => t.completed && t.completion)
      .map(t => ({ name: marketName(t), tag: marketTag(t), date: ymd(t.completion) })),
    open: new Set(tasks.filter(t => !t.completed).map(t => marketName(t).toLowerCase())),
  };
}

async function addToMarket(name, tag) {
  const file = app.vault.getAbstractFileByPath(MARKET_PATH);
  if (file) await app.vault.process(file, c => `${c.replace(/\s+$/, "")}\n- [ ] ${name} ${tag}\n`);
}

// ===== CACHES =====
// The wallet's sums are dropped when their notes change. metadataCache "changed" only fires for markdown.
// Called once by the plugin, which unsubscribes on unload.
function watchCaches(on) {
  on(app.metadataCache, "changed", (file) => {
    if (file.path.startsWith("02 Areas/Personal/Tasks")) Wallet.invalidate("earned");
    else if (file.path.startsWith("00 System/Data/Purchases")) Wallet.invalidate("spent");
  });
}

export const H = { today, ymd, pageDay, AudioEngine, installSounds, isMuted, editTaskLine, editTaskLineWithUndo, taskWindow, editTaskModal, deleteTaskLine, marketName, Wallet, PurchaseLog, loadConfig, taskXp, collectHabitDays, chartColor, marketState, addToMarket, watchCaches };
