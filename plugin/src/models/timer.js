// The pomodoro's clock, without markup (tested by tests/pomodoro.test.mjs). `now` is the clock
// (Date.now; a test's own).
import { todayYmd } from "#/helpers/dates.js";

const DEFAULTS = { focusMin: 25, breakMin: 5 };

// the running session: { sessionType, baseElapsed, startedAt }, in memory only (gone after a
// restart or a reload)
let live = null;

// focus or break and its time: a stopped session counts `elapsed` (ms), a running one also the time
// since `start`
export class Timer {
  constructor(settings, current, now = Date.now) {
    this.now      = now;
    this.settings = { ...DEFAULTS, ...settings };
    this.type     = current?.sessionType ?? "focus";
    this.sessions = current?.sessions ?? 0;
    this.elapsed  = current?.elapsed ?? 0;
    this.start    = 0;
    // picked up after a redraw
    if (live?.sessionType === this.type) {
      this.elapsed = live.baseElapsed;
      this.start = live.startedAt;
    }
  }
  get running()   { return this.start > 0; }
  get duration()  {
    return (this.type === "focus" ? this.settings.focusMin : this.settings.breakMin) * 60_000;
  }
  get remaining() {
    const now = this.running ? this.now() - this.start : 0;   // the running part since `start`

    return Math.max(0, this.duration - this.elapsed - now);
  }
  get other()     { return this.type === "focus" ? "break" : "focus"; }
  // what's left as m:ss
  get clock() {
    const rem = this.remaining;
    const sec = Math.floor(rem % 60_000 / 1000);

    return `${Math.floor(rem / 60_000)}:${String(sec).padStart(2, "0")}`;
  }
  // stars cycle every 4 sessions, ×N counts the full sets: 4 → 4 stars; 5 → 1 star ×1;
  // 13 → 1 star ×3
  get stars() {
    const sets = this.sessions === 0 ? 0 : Math.floor((this.sessions - 1) / 4);

    return { filled: this.sessions - sets * 4, sets };
  }
  play() {
    if (this.running) return;
    this.start = this.now();
    live = { sessionType: this.type, baseElapsed: this.elapsed, startedAt: this.start };
  }
  pause() { if (!this.running) return; this.elapsed += this.now() - this.start; this.stop(); }
  // a session of `type` from zero, stopped
  reset(type = this.type) { this.type = type; this.elapsed = 0; this.stop(); }
  stop()  { this.start = 0; live = null; }
  // the session ended: a focus counts, then the other kind from zero (stopped); true when it
  // was a focus
  next() {
    const wasFocus = this.type === "focus";

    if (wasFocus) this.sessions++;
    this.reset(this.other);
    return wasFocus;
  }
  get current() {
    return {
      sessionType: this.type,
      elapsed: this.elapsed,
      sessions: this.sessions,
      date: todayYmd(),
      savedAt: this.now(),
    };
  }
}

// today's stats in the saved json: a new day starts them over; a finished focus adds its minutes
export function addStats(data, focusMin, today) {
  if (data.stats?.date !== today) data.stats = { date: today, sessions: 0, minutes: 0 };
  if (focusMin) { data.stats.sessions++; data.stats.minutes += focusMin; }

  return data;
}
