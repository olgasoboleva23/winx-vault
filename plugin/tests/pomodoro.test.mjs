import { test } from "node:test";
import assert from "node:assert/strict";
import { Timer, addStats } from "../src/widgets/pomodoro/timer.js";

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
