import { test } from "node:test";
import assert from "node:assert/strict";
import { Timer, addStats } from "#/models/timer.js";

// a clock the test moves
const clock = (t = 1_000_000) => Object.assign(() => t, { go: ms => { t += ms; } });

test("a running session counts down by the clock; a pause keeps what's left", () => {
  const now = clock(), t = new Timer({ focusMin: 25 }, null, now);
  t.play(); now.go(10 * 60_000);
  assert.equal(t.remaining, 15 * 60_000);
  t.pause(); now.go(60 * 60_000);
  assert.equal(t.remaining, 15 * 60_000);
  assert.equal(t.running, false);
  t.stop();
});

test("the next session: a finished focus counts and gives a break; a finished break gives a focus", () => {
  const t = new Timer({ focusMin: 25, breakMin: 5 }, null, clock());
  assert.equal(t.next(), true);
  assert.deepEqual([t.type, t.sessions, t.duration], ["break", 1, 5 * 60_000]);
  assert.equal(t.next(), false);
  assert.deepEqual([t.type, t.sessions], ["focus", 1]);
});

test("a redraw picks up the running session; today's stats start over on a new day", () => {
  const now = clock(), a = new Timer({}, null, now);
  a.play(); now.go(60_000);
  const b = new Timer({}, { sessionType: "focus", elapsed: 0 }, now);
  assert.equal(b.running, true);
  assert.equal(b.remaining, 24 * 60_000);
  b.stop();
  assert.deepEqual(addStats({ stats: { date: "2026-11-01", sessions: 3, minutes: 75 } }, 25, "2026-11-02").stats, { date: "2026-11-02", sessions: 1, minutes: 25 });
  assert.deepEqual(addStats({ stats: { date: "2026-11-02", sessions: 1, minutes: 25 } }, 0, "2026-11-02").stats, { date: "2026-11-02", sessions: 1, minutes: 25 });
});

test("the clock reads m:ss of what's left; stars: 4 per set, ×N the full sets before", () => {
  const now = clock(), t = new Timer({ focusMin: 25 }, null, now);
  assert.equal(t.clock, "25:00");
  t.play(); now.go(10 * 60_000 + 5_500);
  assert.equal(t.clock, "14:54");
  t.stop();
  const at = n => Object.assign(new Timer({}, null, clock()), { sessions: n }).stars;
  assert.deepEqual([at(0), at(4), at(5), at(13)], [{ filled: 0, sets: 0 }, { filled: 4, sets: 0 }, { filled: 1, sets: 1 }, { filled: 1, sets: 3 }]);
});

test("meditation: its own length (10 min by default), one session that stops when it ends, no stars counted", () => {
  const now = clock(), t = new Timer({ focusMin: 25 }, { sessionType: "meditation", sessions: 2 }, now);
  assert.deepEqual([t.type, t.duration, t.clock], ["meditation", 10 * 60_000, "10:00"]);
  t.play(); now.go(10 * 60_000);
  assert.equal(t.next(), false);
  assert.deepEqual([t.type, t.running, t.sessions, t.remaining], ["meditation", false, 2, 10 * 60_000]);
  assert.equal(new Timer({ meditationMin: 15 }, { sessionType: "meditation" }, now).duration, 15 * 60_000);
  // its minutes go apart from the focus ones
  const data = addStats({ stats: { date: "2026-11-08", sessions: 1, minutes: 25 } }, 10, "2026-11-08", "meditation");
  assert.deepEqual(data.stats, { date: "2026-11-08", sessions: 1, minutes: 25, meditation: { sessions: 1, minutes: 10 } });
});

test("the meditation's music: which track plays for a running meditation, none paused, muted or off", async () => {
  const { musicKey } = await import("#/controllers/widgets/pomodoro.js");
  let now = 1_000;
  const t = new Timer({ music: "bells" }, null, () => now);
  t.reset("meditation");
  assert.equal(musicKey(t, false), null);   // stopped
  t.play();
  assert.equal(musicKey(t, false), "bells|1000");
  assert.equal(musicKey(t, true), null);   // muted
  now = 5_000; t.pause(); t.play();
  assert.equal(musicKey(t, false), "bells|5000");   // played again: a new start
  assert.equal(musicKey(Object.assign(t, { settings: { ...t.settings, music: null } }), false), null);
  t.settings.music = "bells"; t.reset("focus"); t.play();
  assert.equal(musicKey(t, false), null);   // a pomodoro: no music
});
