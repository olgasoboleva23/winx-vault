// The screen kept on (the Wake Lock API, which Obsidian's window has): keepAwake(true) asks for it
// once and again after the system let it go (the window hidden, then back); keepAwake(false) lets
// it go. Called by the pomodoro on each tick, so a running session never lets the Mac sleep.
let lock = null, asking = false, want = false;

export async function keepAwake(on) {
  const held = lock && !lock.released;

  want = on;   // what's wanted now: a lock that comes after a "no" is let go at once
  if (on && !held && !asking && !document.hidden) {
    asking = true;
    let got = null;

    try { got = await navigator.wakeLock?.request("screen") ?? null; } catch { got = null; }

    asking = false;
    if (want) lock = got;
    else await got?.release();
  } else if (!on && held) {
    const was = lock;

    lock = null;
    await was.release();
  }
}
