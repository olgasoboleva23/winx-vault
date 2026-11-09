// Sounds: an AudioEngine per file (one shared AudioContext, each file decoded once), the 🔇 switch,
// the tick sounds. Every sound keeps quiet while muted (the calendar's 🔊 button), the timer's and
// the shop's too.
import { app } from "./app.js";
import { SOUNDS } from "./paths.js";

const _audio = { ctx: null, buffers: new Map() };
const _ctx   = () => _audio.ctx ??= new (window.AudioContext || window.webkitAudioContext)();

export class AudioEngine {
  constructor(path) { this.path = path; }

  // the file decoded once, at the first play: at the plugin's load (an Obsidian start) the vault's
  // files aren't indexed yet, so a lookup then finds nothing; a file not found isn't remembered
  #buffer() {
    if (!_audio.buffers.has(this.path)) {
      const file = app.metadataCache.getFirstLinkpathDest(this.path, "");

      if (!file) { console.warn(`AudioEngine: ${this.path} not found`); return null; }

      _audio.buffers.set(this.path,
        app.vault.adapter.readBinary(file.path).then(b => _ctx().decodeAudioData(b)));
    }

    return _audio.buffers.get(this.path);
  }

  async play({ rate = 1.0, gain = 0.3, duration = 1.2 } = {}) {
    if (isMuted()) return;
    const buffer = await this.#buffer();

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

  // on repeat for `left` ms (the meditation's music): in over 2 s, out over its last `fade` s;
  // null while muted. The handle's stop() ends it now, with a short fade (no click)
  async loop(left, { gain = 0.25, fade = 8 } = {}) {
    if (isMuted()) return null;
    const buffer = await this.#buffer();

    if (!buffer) return null;
    const ctx = _ctx(), src = ctx.createBufferSource(), g = ctx.createGain();
    const t = ctx.currentTime, end = t + left / 1000;

    if (ctx.state === "suspended") ctx.resume();
    src.buffer = buffer;
    src.loop = true;
    src.connect(g).connect(ctx.destination);
    g.gain.setValueAtTime(0.001, t);
    g.gain.exponentialRampToValueAtTime(gain, t + 2);
    g.gain.setValueAtTime(gain, Math.max(t + 2, end - fade));
    g.gain.linearRampToValueAtTime(0, end);
    src.start();
    src.stop(end);
    return {
      stop: () => {
        const n = ctx.currentTime;

        g.gain.cancelScheduledValues(n);
        g.gain.setValueAtTime(g.gain.value, n);
        g.gain.linearRampToValueAtTime(0, n + 0.3);
        try { src.stop(n + 0.3); } catch { /* it has ended already */ }
      },
    };
  }
}


export const isMuted = () => app.loadLocalStorage("winx-mute") === "1";

// a mark's sound (WinxCheckbox, a course's chips): a gem for ✅, the slowed gem back to ☐, a
// chime for ❌
const MARK_SOUNDS = {
  "✅": () => new AudioEngine(`${SOUNDS}/snd_pickup_gem0${1 + Math.floor(Math.random() * 6)}.wav`),
  "☐": () => new AudioEngine(`${SOUNDS}/snd_pickup_gem01.wav`),
  "❌": () => new AudioEngine(`${SOUNDS}/snd_pressure_chime.wav`),
};

export const playMark = mark =>
  void MARK_SOUNDS[mark]?.().play(mark === "☐" ? { rate: 0.6, gain: 0.2 } : { gain: 0.25 });

export const toggleMute = () => app.saveLocalStorage("winx-mute", isMuted() ? null : "1");

// ticking a task anywhere
// installed by the plugin on load; its registerDomEvent removes the listener on unload
export function installSounds(plugin) {
  const gems   = [1, 2, 3, 4, 5, 6]
    .map(n => new AudioEngine(`00 System/Assets/winx music/snd_pickup_gem0${n}.wav`));
  const flower = new AudioEngine(`${SOUNDS}/snd_pickup_dragon_flower.wav`);
  // capture phase: the checkbox already shows its new state, before Tasks re-renders it
  plugin.registerDomEvent(document, "click", e => {
    const box = e.target.closest?.("input.task-list-item-checkbox");

    if (!box) return;
    // unticked: the same gem, slowed down
    if (!box.checked) return gems[0].play({ rate: 0.6, gain: 0.2 });
    const goal = !!box.closest("[data-goal]");   // a calendar row of a goal's task
    (goal ? flower : gems[Math.floor(Math.random() * gems.length)]).play({ gain: 0.25 });
  }, true);
}
