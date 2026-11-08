// The screen kept on (the Wake Lock API, which Obsidian's window has): keepAwake(true) asks for it
// once and again after the system let it go (the window hidden, then back); keepAwake(false) lets
// it go. Called by the pomodoro on each tick, so a running session never lets the Mac sleep.
let lock = null, asking = false;

export async function keepAwake(on) {
  const held = lock && !lock.released;

  if (on && !held && !asking && !document.hidden) {
    asking = true;
    try { lock = await navigator.wakeLock?.request("screen") ?? null; } catch { lock = null; }

    asking = false;
  } else if (!on && held) {
    const was = lock;

    lock = null;
    await was.release();
  }
}
