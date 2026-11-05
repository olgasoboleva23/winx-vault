import { test } from "node:test";
import assert from "node:assert/strict";
import { setApp } from "#/helpers/app.js";
import { AudioEngine } from "#/helpers/sounds.js";

// an AudioContext in memory: every source started is counted
const audio = () => {
  const started = [];
  const node = () => ({ connect: () => node(), start: () => started.push(1), stop() {}, playbackRate: {}, gain: { setValueAtTime() {}, exponentialRampToValueAtTime() {} } });
  globalThis.window = { AudioContext: class { state = "running"; currentTime = 0; destination = {}; decodeAudioData = async b => ({ bytes: b }); createBufferSource = node; createGain = node; } };
  return started;
};

test("a sound's file is looked up at the first play, not when the engine is made: at the plugin's load the vault isn't indexed yet", async () => {
  const started = audio();
  let indexed = false;
  setApp({
    loadLocalStorage: () => null,
    metadataCache: { getFirstLinkpathDest: p => indexed ? { path: p } : null },
    vault: { adapter: { readBinary: async () => new ArrayBuffer(4) } },
  });
  const warned = console.warn;
  console.warn = () => {};
  const gem = new AudioEngine("00 System/Assets/star.wav");
  await gem.play();                       // not indexed yet: nothing, and nothing remembered
  assert.equal(started.length, 0);
  indexed = true;
  await gem.play();
  assert.equal(started.length, 1);
  console.warn = warned;
});
