import { test } from "node:test";
import assert from "node:assert/strict";
import { setApp } from "#/helpers/app.js";
import { pomodoroActions } from "#/controllers/widgets/pomodoro.js";
import { POMODORO as PATH } from "#/helpers/paths.js";

globalThis.window ??= {};
window.moment ??= () => ({ format: () => "2027-01-15" });   // today

// pomodoro.json in memory; a read gives the text as it was asked for a moment later, so two saves can overlap; `failing` writes throw
const vault = () => {
  const files = { [PATH]: "{}" }, io = { failing: 0 };
  setApp({
    metadataCache: { getFirstLinkpathDest: () => null },
    vault: { adapter: {
      exists: async p => p in files,
      read: p => { const text = files[p]; return new Promise(r => setTimeout(() => r(text), 1)); },
      write: async (p, text) => {
        if (io.failing-- > 0) throw new Error("disk");
        files[p] = text;
      },
    } },
  });
  return { stats: () => JSON.parse(files[PATH]).stats, io };
};
const state = { settings: { focusMin: 25, breakMin: 5 }, current: null, mini: true };

test("two saves at once: the later one keeps the minutes the earlier one added", async () => {
  const { stats } = vault();
  const { save } = pomodoroActions();
  await Promise.all([save(state, 25), save({ ...state, mini: false })]);
  assert.equal(stats().minutes, 25);
  assert.equal(stats().sessions, 1);
});

test("a failed save: its minutes go with the next one, each session counted once", async () => {
  const { stats, io } = vault();
  const { save } = pomodoroActions();
  io.failing = 1;
  await assert.rejects(save(state, 25));
  await save(state, 25);
  assert.deepEqual([stats().sessions, stats().minutes], [2, 50]);
  await save(state);
  assert.equal(stats().minutes, 50);
});
