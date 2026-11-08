import { test, before, after, mock } from "node:test";
import assert from "node:assert/strict";
import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { vault } from "./stubs/vault.mjs";
import { POMODORO } from "#/helpers/paths.js";

let mount, nextTick, PomodoroTimer, Timer;
const NOW = 1_800_000_000_000;
before(async () => {
  GlobalRegistrator.register();
  mock.timers.enable({ apis: ["Date", "setTimeout", "setInterval"], now: NOW });
  window.moment = () => ({ format: () => "2027-01-15" });
  ({ mount } = await import("@vue/test-utils"));
  ({ nextTick } = await import("vue"));
  PomodoroTimer = (await import("#/components/pages/dashboard/widgets/pomodoro/index.vue")).default;
  ({ Timer } = await import("#/models/timer.js"));
});
after(() => mock.timers.reset());

// a 25/5 pomodoro on a pomodoro.json in memory: json() is what the saves wrote
const draw = (saved = { settings: { focusMin: 25, breakMin: 5 } }) => {
  new Timer().stop();   // no running session left over from another test
  const { files, io } = vault({ [POMODORO]: "{}" });
  const json = () => JSON.parse(files[POMODORO]);
  return { w: mount(PomodoroTimer, { props: { state: { data: { saved, current: null } } } }), json, io };
};
// a save done: the queue's turn, the read, the write (setImmediate isn't mocked: every microtask runs)
const saved = () => new Promise(r => setImmediate(r));

test("▶ runs the clock, a second later the time moves; ⏸ stops it; ↺ starts over; each is saved", async () => {
  const { w, json } = draw();
  await nextTick();
  assert.equal(w.find(".winx-pomodoro__time").text(), "25:00");
  await w.find(".winx-pomodoro__btn--play").trigger("click");
  mock.timers.tick(61_000); await nextTick();
  assert.equal(w.find(".winx-pomodoro__time").text(), "23:59");
  await w.find(".winx-pomodoro__btn--play").trigger("click"); await saved();   // pause
  assert.equal(json().current.elapsed, 61_000);
  mock.timers.tick(10_000); await nextTick();
  assert.equal(w.find(".winx-pomodoro__time").text(), "23:59");
  await w.find(".winx-pomodoro__btn--reset").trigger("click"); await nextTick(); await saved();
  assert.equal(w.find(".winx-pomodoro__time").text(), "25:00");
  assert.equal(json().current.elapsed, 0);
  w.unmount();
});

test("the small row opens into the ring (kept in the json); a finished focus counts its minutes", async () => {
  const { w, json } = draw();
  await nextTick();
  assert.ok(w.classes().includes("winx-pomodoro--mini"));
  await w.find(".winx-pomodoro__mini-time").trigger("click"); await nextTick();
  assert.ok(!w.classes().includes("winx-pomodoro--mini")); await saved();
  assert.equal(json().mini, false);
  await w.find(".winx-pomodoro__mini-play").trigger("click");
  mock.timers.tick(25 * 60_000); await nextTick(); await nextTick(); await saved();
  assert.equal(w.find(".winx-pomodoro__mode-text").text(), "Break");
  assert.deepEqual([json().stats.sessions, json().stats.minutes], [1, 25]);
  w.unmount();
});

test("a running session keeps the screen awake: ▶ asks for the wake lock, ⏸ lets it go, so does closing", async () => {
  const locks = [];
  Object.defineProperty(navigator, "wakeLock", {
    configurable: true,
    value: { request: async type => { const l = { type, released: false, release: async () => { l.released = true; } }; locks.push(l); return l; } },
  });
  const { w } = draw();
  await nextTick();
  assert.equal(locks.length, 0);   // stopped: nothing asked
  await w.find(".winx-pomodoro__btn--play").trigger("click"); await saved();
  assert.deepEqual(locks.map(l => [l.type, l.released]), [["screen", false]]);
  mock.timers.tick(3_000); await saved();
  assert.equal(locks.length, 1);   // asked once, not every second
  await w.find(".winx-pomodoro__btn--play").trigger("click"); await saved();   // pause
  assert.equal(locks[0].released, true);
  await w.find(".winx-pomodoro__btn--play").trigger("click"); await saved();
  assert.deepEqual([locks.length, locks[1].released], [2, false]);
  // the system let it go (the window hidden): asked again once the clock ticks with the window back
  locks[1].released = true;
  mock.timers.tick(1_000); await saved();
  assert.deepEqual([locks.length, locks[2].released], [3, false]);
  w.unmount(); await saved();
  assert.equal(locks[2].released, true);
  delete navigator.wakeLock;
});

test("🧘 switches to meditation: its own clock, no stars; at its end a bell, the clock stops, its minutes counted apart", async () => {
  const { w, json } = draw();
  await nextTick();
  await w.find(".winx-pomodoro__mode-switch").trigger("click"); await nextTick(); await saved();
  assert.deepEqual([w.find(".winx-pomodoro__time").text(), w.find(".winx-pomodoro__mode-text").text()], ["10:00", "Meditation"]);
  assert.equal(w.find(".winx-pomodoro__settings-info").text(), "10m");
  assert.ok(!w.find(".winx-pomodoro__stars").exists());
  assert.equal(json().current.sessionType, "meditation");
  await w.find(".winx-pomodoro__btn--play").trigger("click");
  mock.timers.tick(10 * 60_000); await nextTick(); await nextTick(); await saved();
  assert.equal(w.find(".winx-pomodoro__time").text(), "10:00");
  assert.equal(w.find(".winx-pomodoro__btn--play").html().includes("M8 5v14"), true);   // ▶: stopped
  assert.deepEqual(json().stats.meditation, { sessions: 1, minutes: 10 });
  assert.equal(json().stats.sessions, 0);
  // back to the pomodoro
  await w.find(".winx-pomodoro__mode-switch").trigger("click"); await nextTick();
  assert.deepEqual([w.find(".winx-pomodoro__time").text(), w.find(".winx-pomodoro__mode-text").text()], ["25:00", "Focus"]);
  w.unmount();
});

test("unmounted: the clock stops ticking (no more timers)", async () => {
  const { w } = draw();
  await w.find(".winx-pomodoro__btn--play").trigger("click");
  const spy = mock.method(window, "clearInterval");
  w.unmount();
  assert.equal(spy.mock.callCount(), 1);
  spy.mock.restore();
});

test("a save that fails: a finished session says its minutes weren't saved; a click's goes to the app", async () => {
  const { Notice } = await import("obsidian");
  const quiet = mock.method(console, "error", () => {});
  new Timer().stop();
  const errors = [];
  const { io } = vault({ [POMODORO]: "{}" });
  const w = mount(PomodoroTimer, {
    props: { state: { data: { saved: { settings: { focusMin: 25, breakMin: 5 } }, current: null } } },
    global: { config: { errorHandler: e => errors.push(e) } },
  });
  io.failing = 3;   // the ⇄ click's save, ▶'s, the finished session's
  await w.find(".winx-pomodoro__mini-time").trigger("click");
  await nextTick(); await saved(); await nextTick();
  assert.equal(errors.length, 1);
  Notice.last = null;
  await w.find(".winx-pomodoro__mini-play").trigger("click");
  mock.timers.tick(25 * 60_000); await nextTick(); await nextTick(); await saved();
  assert.match(String(Notice.last), /not saved/);
  quiet.mock.restore();
  w.unmount();
});
