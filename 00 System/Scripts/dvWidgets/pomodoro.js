// ===== CONFIG =====
const PATH = "00 System/Data/pomodoro.json";
const DEFAULTS = { focusMin: 25, breakMin: 5 };

// ===== HELPERS =====
const { AudioEngine } = eval(await app.vault.adapter.read("00 System/Scripts/dvWidgets/helpers.js"));

// ===== ICONS =====
const icons = {
  play:  () => `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
  pause: () => `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`,
  star:  () => `<svg viewBox="0 0 24 24"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z"/></svg>`,
  reset: () => `<svg viewBox="0 0 24 24"><path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`,
  gear:  () => `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.08-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
  skip:  () => `<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zm-3.5 6L4 6v12z"/></svg>`,
};

// ===== LIVE STATE =====
// In-process memory only. Survives dataview re-renders; cleared when Obsidian restarts.
const Live = {
  read()   { return globalThis.app?.__pomodoroLive ?? null; },
  write(s) { if (globalThis.app) globalThis.app.__pomodoroLive = s; },
  clear()  { if (globalThis.app) delete globalThis.app.__pomodoroLive; },
};

// ===== STORAGE =====
class Storage {
  static async load() {
    try {
      const file = app.vault.getAbstractFileByPath(PATH);
      if (!file) return {};
      return JSON.parse(await app.vault.read(file));
    } catch { return {}; }
  }

  static async save(data) {
    const raw = JSON.stringify(data, null, 2);
    const file = app.vault.getAbstractFileByPath(PATH);
    file
      ? await app.vault.modify(file, raw)
      : await app.vault.create(PATH, raw);
  }
}

// ===== TIMER =====
class PomodoroTimer {
  #elapsed = 0;
  #start = 0;
  #running = false;
  #completionTimer = null;
  #onCompleteCallback = null;

  constructor(settings, current) {
    this.settings    = { ...DEFAULTS, ...settings };
    this.sessionType = current?.sessionType ?? "focus";
    this.sessions    = current?.sessions    ?? 0;
    this.#elapsed    = current?.elapsed     ?? 0;
    this.duration    = this.#durationMs();

    // If a session was running before the dashboard refreshed, pick up where it left off.
    // Completion timeout is armed when onComplete() is called by the UI after construction.
    const live = Live.read();
    if (live?.running && live.sessionType === this.sessionType) {
      this.#elapsed = live.baseElapsed;
      this.#start   = live.startedAt;
      this.#running = true;
    }
  }

  get running() { return this.#running; }

  #durationMs(type = this.sessionType) {
    const min = type === "focus" ? this.settings.focusMin : this.settings.breakMin;
    return min * 60_000;
  }

  elapsedTotal() {
    return this.#elapsed + (this.#running ? Date.now() - this.#start : 0);
  }

  remaining() { return Math.max(0, this.duration - this.elapsedTotal()); }
  progress()  { return 1 - this.remaining() / this.duration; }

  // Setting the callback also arms the completion timeout if the timer is already running
  // (i.e. restored from Live state after a re-render). Eliminates the need for a separate
  // _rearmCompletion call from the UI.
  onComplete(cb) {
    this.#onCompleteCallback = cb;
    if (this.#running) this.#scheduleCompletion();
  }

  start() {
    if (this.#running) return;
    this.#running = true;
    this.#start   = Date.now();
    Live.write({
      running:     true,
      sessionType: this.sessionType,
      baseElapsed: this.#elapsed,
      startedAt:   this.#start,
    });
    this.#scheduleCompletion();
  }

  pause() {
    if (!this.#running) return;
    this.#elapsed = this.elapsedTotal();
    this.#running = false;
    this.#start   = 0;
    this.#clearLiveAndTimeout();
  }

  toggle() { this.#running ? this.pause() : this.start(); }

  resetSession() {
    this.#elapsed = 0;
    this.#running = false;
    this.#start   = 0;
    this.duration = this.#durationMs();
    this.#clearLiveAndTimeout();
  }

  // Jump to next session without counting current as completed.
  skipSession() {
    this.sessionType = this.sessionType === "focus" ? "break" : "focus";
    this.duration    = this.#durationMs();
    this.#elapsed    = 0;
    this.#running    = false;
    this.#start      = 0;
    this.#clearLiveAndTimeout();
  }

  applySettings(focusMin, breakMin) {
    this.settings = { focusMin, breakMin };
    this.resetSession();
  }

  // Returns { wasFocus, focusMin } for stats
  complete() {
    const wasFocus = this.sessionType === "focus";
    const focusMin = this.settings.focusMin;

    if (wasFocus) this.sessions++;

    this.sessionType = wasFocus ? "break" : "focus";
    this.duration    = this.#durationMs();
    this.#elapsed    = 0;
    this.#running    = false;
    this.#start      = 0;
    this.#clearLiveAndTimeout();

    return { wasFocus, focusMin };
  }

  // Cancels the completion timeout without touching other state.
  // Used by PomodoroUI.destroy() to cleanly shut down without affecting Live.
  destroy() { this.#clearTimeout(); }

  serialize() {
    return {
      sessionType: this.sessionType,
      elapsed:     this.#elapsed,
      sessions:    this.sessions,
      date:        window.moment().format("YYYY-MM-DD"),
      savedAt:     Date.now(),
    };
  }

  #scheduleCompletion() {
    this.#clearTimeout();
    this.#completionTimer = setTimeout(() => {
      this.#completionTimer = null;
      this.#onCompleteCallback?.();
    }, this.remaining());
  }

  #clearTimeout() {
    if (this.#completionTimer !== null) {
      clearTimeout(this.#completionTimer);
      this.#completionTimer = null;
    }
  }

  #clearLiveAndTimeout() {
    Live.clear();
    this.#clearTimeout();
  }
}

// ===== UI =====
class PomodoroUI {
  #intervalId = null;
  #completing = false;
  #onVisibility = null;
  #onFocus = null;
  #tickFn = null;

  constructor(container, timer, audio) {
    this.container = container;
    this.timer     = timer;
    this.audio     = audio;
  }

  mount() {
    this.container.innerHTML = `
<div class="pomodoro">
  <div class="ring">
    <div class="wing left"></div>
    <div class="wing right"></div>
    <div class="top-star">${icons.star()}</div>
    <div class="time">--:--</div>
    <div class="controls">
      <button class="btn reset-btn">${icons.reset()}</button>
      <button class="btn play">${icons.play()}</button>
      <button class="btn skip-btn">${icons.skip()}</button>
    </div>
  </div>

  <div class="mode-label">
    <span class="mode-text"></span>
    <span class="session-count"></span>
  </div>

  <div class="stars">
    ${[0,1,2,3].map(() => `<div class="s">${icons.star()}</div>`).join("")}
    <span class="multiplier"></span>
  </div>

  <div class="bottom-bar">
      <span class="settings-info"></span>
      <button class="gear-btn">${icons.gear()}</button>
    </div>

  <div class="settings-panel hidden">
    <label>Focus <input class="s-focus" type="number" min="1" max="120"/><span>min</span></label>
    <label>Break <input class="s-break" type="number" min="1" max="60"/><span>min</span></label>
    <button class="s-save">Save</button>
  </div>
</div>`;

    const q = s => this.container.querySelector(s);
    this.timeEl       = q(".time");
    this.playBtn      = q(".btn.play");
    this.resetBtn     = q(".reset-btn");
    this.skipBtn      = q(".skip-btn");
    this.gearBtn      = q(".gear-btn");
    this.ring         = q(".ring");
    this.stars        = [...this.container.querySelectorAll(".s")];
    this.multiplier   = q(".multiplier");
    this.modeText     = q(".mode-text");
    this.sessionCount = q(".session-count");
    this.settingsInfo = q(".settings-info");

    this.resetBtn.onclick = async () => {
      this.timer.resetSession();
      this.#updatePlayBtn();
      await this.#save();
    };

    this.skipBtn.onclick = async () => {
      this.timer.skipSession();
      this.#updatePlayBtn();
      await this.#save();
    };

    this.playBtn.onclick = async () => {
      this.timer.toggle();
      this.#updatePlayBtn();
      await this.#save();
    };

    this.settingsPanel = q(".settings-panel");
    this.focusInput    = q(".s-focus");
    this.breakInput    = q(".s-break");
    this.saveBtn       = q(".s-save");

    this.gearBtn.onclick = () => {
      const open = !this.settingsPanel.classList.contains("hidden");
      if (!open) {
        this.focusInput.value = this.timer.settings.focusMin;
        this.breakInput.value = this.timer.settings.breakMin;
      }
      this.settingsPanel.classList.toggle("hidden", open);
    };

    this.saveBtn.onclick = async () => {
      const f = parseInt(this.focusInput.value);
      const b = parseInt(this.breakInput.value);
      if ([f, b].every(n => !isNaN(n) && n > 0)) {
        this.timer.applySettings(f, b);
        this.settingsPanel.classList.add("hidden");
        await this.#save();
      }
    };

    // onComplete() also arms the timeout if timer is already running (Live restore).
    this.timer.onComplete(() => this.#onComplete());
    this.#updatePlayBtn();
    this.#loop();

    this.#onVisibility = () => { if (!document.hidden) this.#tickFn?.(); };
    this.#onFocus      = () => this.#tickFn?.();
    document.addEventListener("visibilitychange", this.#onVisibility);
    window.addEventListener("focus", this.#onFocus);
  }

  destroy() {
    clearInterval(this.#intervalId);
    document.removeEventListener("visibilitychange", this.#onVisibility);
    window.removeEventListener("focus", this.#onFocus);
    this.timer.destroy();
  }

  #updatePlayBtn() {
    this.playBtn.innerHTML = this.timer.running ? icons.pause() : icons.play();
  }

  async #save({ updateStats = false, focusMin = 0 } = {}) {
    const data  = await Storage.load();
    const today = window.moment().format("YYYY-MM-DD");

    data.settings = this.timer.settings;
    data.current  = this.timer.serialize();
    data.stats  ??= { date: today, sessions: 0, minutes: 0 };

    if (data.stats.date !== today) {
      data.stats = { date: today, sessions: 0, minutes: 0 };
    }

    if (updateStats) {
      data.stats.sessions++;
      data.stats.minutes += focusMin;
    }

    await Storage.save(data);
  }

  async #onComplete() {
    if (!this.timeEl?.isConnected) return; // ghost-instance guard
    if (this.#completing) return;
    this.#completing = true;

    const { wasFocus, focusMin } = this.timer.complete();
    this.audio.play({ rate: this.timer.sessionType === "focus" ? 1.0 : 0.8 });
    this.timer.start();
    this.#updatePlayBtn();
    await this.#save({ updateStats: wasFocus, focusMin });

    this.#completing = false;
  }

  #loop() {
    this.#tickFn = () => {
      // Ghost-instance guard: DOM was wiped by a dashboard re-render.
      if (!this.timeEl?.isConnected) {
        this.destroy();
        return;
      }

      const rem = this.timer.remaining();
      const m   = Math.floor(rem / 60_000);
      const s   = Math.floor((rem % 60_000) / 1_000);

      this.timeEl.textContent = `${m}:${s.toString().padStart(2, "0")}`;
      this.ring.style.setProperty("--p", this.timer.progress());

      const { sessions, sessionType, settings } = this.timer;

      this.modeText.textContent     = sessionType === "focus" ? "Focus" : "Break";
      this.sessionCount.textContent = `Session ${sessions + 1}`;
      this.settingsInfo.textContent = `${settings.focusMin}m · ${settings.breakMin}m`;

      // Stars cycle every 4 sessions; multiplier shows completed full sets.
      // 0 -> 0/4 stars, no badge.   4 -> 4/4 stars, no badge.
      // 5 -> 1/4 stars, ×1.         8 -> 4/4 stars, ×1.
      // 13 -> 1/4 stars, ×3.
      const completedSets = sessions === 0 ? 0 : Math.floor((sessions - 1) / 4);
      const filled        = sessions - completedSets * 4;
      this.stars.forEach((el, i) => el.classList.toggle("on", i < filled));
      this.multiplier.textContent = completedSets > 0 ? `×${completedSets}` : "";
    };

    this.#tickFn();
    this.#intervalId = setInterval(this.#tickFn, 1000);
  }
}

// ===== INIT =====
const container = dv.container;
container.classList.add("winx-pomodoro");

const saved   = await Storage.load();
const today   = window.moment().format("YYYY-MM-DD");
const current = saved?.current?.date === today ? saved.current : null;

const timer = new PomodoroTimer(saved?.settings, current);
const audio = new AudioEngine("00 System/Assets/sparkle.wav");
const ui    = new PomodoroUI(container, timer, audio);
ui.mount();
