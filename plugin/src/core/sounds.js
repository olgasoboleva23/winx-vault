// Sounds: an AudioEngine per file (one shared AudioContext, each file decoded once), the 🔇 switch, the tick sounds.
// Every sound keeps quiet while muted (the calendar's 🔊 button), the timer's and the shop's too.
const _audio = { ctx: null, buffers: new Map() };
const _ctx   = () => _audio.ctx ??= new (window.AudioContext || window.webkitAudioContext)();

export class AudioEngine {
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
    if (isMuted()) return;
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


export const isMuted = () => app.loadLocalStorage("winx-mute") === "1";
export const toggleMute = () => app.saveLocalStorage("winx-mute", isMuted() ? null : "1");

// ticking a task anywhere
// installed by the plugin on load; its registerDomEvent removes the listener on unload
export function installSounds(plugin) {
  const gems   = [1, 2, 3, 4, 5, 6].map(n => new AudioEngine(`00 System/Assets/winx music/snd_pickup_gem0${n}.wav`));
  const flower = new AudioEngine("00 System/Assets/winx music/snd_pickup_dragon_flower.wav");
  // capture phase: the checkbox already shows its new state, before Tasks re-renders it
  plugin.registerDomEvent(document, "click", e => {
    const box = e.target.closest?.("input.task-list-item-checkbox");
    if (!box) return;
    if (!box.checked) return gems[0].play({ rate: 0.6, gain: 0.2 });   // unticked: the same gem, slowed down
    const goal = (box.closest("li")?.textContent ?? "").includes("#goal/");
    (goal ? flower : gems[Math.floor(Math.random() * gems.length)]).play({ gain: 0.25 });
  }, true);
}
