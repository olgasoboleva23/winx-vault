// Pomodoro: a 25/5 focus timer in a ring, session stars, and its settings; state in 00 System/Data/pomodoro.json
// (settings, the current session, today's stats). A running session lives on in this module through redraws;
// the ticking stops when the block goes.
import { html, raw } from "../core/html.js";
import { Widget } from "./widget.js";
import { todayYmd } from "../core/dates.js";
import { readJson } from "../core/files.js";
import { AudioEngine } from "../core/sounds.js";

const PATH = "00 System/Data/pomodoro.json";
const DEFAULTS = { focusMin: 25, breakMin: 5 };
const ICON = {
  play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`,
  star: `<svg viewBox="0 0 24 24"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z"/></svg>`,
  reset: `<svg viewBox="0 0 24 24"><path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`,
  gear: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.08-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
  skip: `<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zm-3.5 6L4 6v12z"/></svg>`,
};

// the running session: { sessionType, baseElapsed, startedAt }, in memory only (gone after a restart or a reload)
let live = null;

const load = () => readJson(PATH, {});

// focus or break and its time: a stopped session counts `elapsed` (ms), a running one also the time since `start`
class Timer {
  constructor(settings, current) {
    this.settings = { ...DEFAULTS, ...settings };
    this.type     = current?.sessionType ?? "focus";
    this.sessions = current?.sessions ?? 0;
    this.elapsed  = current?.elapsed ?? 0;
    this.start    = 0;
    if (live?.sessionType === this.type) { this.elapsed = live.baseElapsed; this.start = live.startedAt; }   // picked up after a redraw
  }
  get running()   { return this.start > 0; }
  get duration()  { return (this.type === "focus" ? this.settings.focusMin : this.settings.breakMin) * 60_000; }
  get remaining() { return Math.max(0, this.duration - this.elapsed - (this.running ? Date.now() - this.start : 0)); }
  get other()     { return this.type === "focus" ? "break" : "focus"; }
  play()  { if (this.running) return; this.start = Date.now(); live = { sessionType: this.type, baseElapsed: this.elapsed, startedAt: this.start }; }
  pause() { if (!this.running) return; this.elapsed += Date.now() - this.start; this.stop(); }
  reset(type = this.type) { this.type = type; this.elapsed = 0; this.stop(); }   // a session of `type` from zero, stopped
  stop()  { this.start = 0; live = null; }
  get current() { return { sessionType: this.type, elapsed: this.elapsed, sessions: this.sessions, date: todayYmd(), savedAt: Date.now() }; }
}

export class Pomodoro extends Widget {
  static followsChanges = false;   // the timer redraws itself every second; a redraw would restart its markup
  sound = new AudioEngine("00 System/Assets/sparkle.wav");
  on = {
    reset: () => this.act(t => t.reset()),
    skip:  () => this.act(t => t.reset(t.other)),   // to the next session, this one not counted
    play:  () => this.act(t => t.running ? t.pause() : t.play()),
    gear:  () => {
      const panel = this.q(".winx-pomodoro__settings"), open = !panel.classList.contains("winx-is-hidden");
      if (!open) { this.q(".winx-pomodoro__input--focus").value = this.timer.settings.focusMin; this.q(".winx-pomodoro__input--break").value = this.timer.settings.breakMin; }
      panel.classList.toggle("winx-is-hidden", open);
    },
    saveSettings: () => {
      const focusMin = parseInt(this.q(".winx-pomodoro__input--focus").value), breakMin = parseInt(this.q(".winx-pomodoro__input--break").value);
      if (![focusMin, breakMin].every(n => n > 0)) return;
      this.q(".winx-pomodoro__settings").classList.add("winx-is-hidden");
      this.act(t => { t.settings = { focusMin, breakMin }; t.reset(); });
    },
  };

  async data() {
    const saved = await load();
    return { saved, current: saved.current?.date === todayYmd() ? saved.current : null };
  }
  view() {
    return html`<div class="winx-pomodoro">
    <div class="winx-pomodoro__body">
      <div class="winx-pomodoro__ring">
        <div class="winx-pomodoro__wing winx-pomodoro__wing--left"></div>
        <div class="winx-pomodoro__wing winx-pomodoro__wing--right"></div>
        <div class="winx-pomodoro__top-star">${raw(ICON.star)}</div>
        <div class="winx-pomodoro__time">--:--</div>
        <div class="winx-pomodoro__controls">
          <button class="winx-pomodoro__btn winx-pomodoro__btn--reset" data-action="reset">${raw(ICON.reset)}</button>
          <button class="winx-pomodoro__btn winx-pomodoro__btn--play" data-action="play">${raw(ICON.play)}</button>
          <button class="winx-pomodoro__btn winx-pomodoro__btn--skip" data-action="skip">${raw(ICON.skip)}</button>
        </div>
      </div>
    
      <div class="winx-pomodoro__mode">
        <span class="winx-pomodoro__mode-text"></span>
        <span class="winx-pomodoro__session"></span>
      </div>
    
      <div class="winx-pomodoro__stars">
        ${[0, 1, 2, 3].map(() => html`<div class="winx-pomodoro__star">${raw(ICON.star)}</div>`)}
        <span class="winx-pomodoro__multiplier"></span>
      </div>
    
      <div class="winx-pomodoro__bottom">
          <span class="winx-pomodoro__settings-info"></span>
          <button class="winx-pomodoro__gear" data-action="gear">${raw(ICON.gear)}</button>
        </div>
    
      <div class="winx-pomodoro__settings winx-is-hidden">
        <label class="winx-pomodoro__field">Focus <input class="winx-pomodoro__input winx-pomodoro__input--focus" type="number" min="1" max="120"/><span class="winx-pomodoro__unit">min</span></label>
        <label class="winx-pomodoro__field">Break <input class="winx-pomodoro__input winx-pomodoro__input--break" type="number" min="1" max="60"/><span class="winx-pomodoro__unit">min</span></label>
        <button class="winx-pomodoro__save" data-action="saveSettings">Save</button>
      </div>
    </div></div>`;
  }
  after(root, { saved, current }) {
    this.box = root.querySelector(".winx-pomodoro");
    this.timer = new Timer(saved.settings, current);
    this.arm(); this.tick();
    const every = setInterval(() => this.tick(), 1000);
    this.keep({ destroy: () => { clearInterval(every); clearTimeout(this.ending); } });
  }

  onload() {
    // back to the window: at once (timers in a window in the background run late)
    this.registerDomEvent(document, "visibilitychange", () => document.hidden || this.timer && this.tick());
    this.registerDomEvent(window, "focus", () => this.timer && this.tick());
    return super.onload();
  }
  q(sel) { return this.box.querySelector(sel); }
  async act(change) { change(this.timer); this.arm(); this.tick(); await this.save(); }
  // the end of a running session: the next one starts by itself
  arm() {
    clearTimeout(this.ending);
    if (this.timer.running) this.ending = setTimeout(() => this.finish(), this.timer.remaining);
  }
  async finish() {
    const t = this.timer, wasFocus = t.type === "focus", focusMin = t.settings.focusMin;
    if (wasFocus) t.sessions++;
    t.reset(t.other);
    this.sound.play({ rate: t.type === "focus" ? 1.0 : 0.8 });
    t.play(); this.arm(); this.tick();
    await this.save(wasFocus ? focusMin : 0);
  }
  // settings, the current session and today's stats (a finished focus session adds its minutes)
  async save(focusMin = 0) {
    const data = await load(), today = todayYmd();
    data.settings = this.timer.settings;
    data.current = this.timer.current;
    if (data.stats?.date !== today) data.stats = { date: today, sessions: 0, minutes: 0 };
    if (focusMin) { data.stats.sessions++; data.stats.minutes += focusMin; }
    await app.vault.adapter.write(PATH, JSON.stringify(data, null, 2));
  }

  tick() {
    const t = this.timer, rem = t.remaining;
    this.q(".winx-pomodoro__time").textContent = `${Math.floor(rem / 60_000)}:${String(Math.floor(rem % 60_000 / 1000)).padStart(2, "0")}`;
    this.q(".winx-pomodoro__ring").style.setProperty("--p", 1 - rem / t.duration);
    this.q(".winx-pomodoro__mode-text").textContent = t.type === "focus" ? "Focus" : "Break";
    this.q(".winx-pomodoro__session").textContent = `Session ${t.sessions + 1}`;
    this.q(".winx-pomodoro__settings-info").textContent = `${t.settings.focusMin}m · ${t.settings.breakMin}m`;
    if (this.box.dataset.running !== String(t.running)) { this.box.dataset.running = t.running; this.q(".winx-pomodoro__btn--play").innerHTML = t.running ? ICON.pause : ICON.play; }
    // stars cycle every 4 sessions, ×N counts the full sets: 4 → 4 stars; 5 → 1 star ×1; 13 → 1 star ×3
    const sets = t.sessions === 0 ? 0 : Math.floor((t.sessions - 1) / 4), filled = t.sessions - sets * 4;
    this.box.querySelectorAll(".winx-pomodoro__star").forEach((el, i) => el.classList.toggle("winx-pomodoro__star--on", i < filled));
    this.q(".winx-pomodoro__multiplier").textContent = sets > 0 ? `×${sets}` : "";
  }
}
