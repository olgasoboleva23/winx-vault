// The pomodoro's controller: its state in 00 System/Data/pomodoro.json (settings, the current
// session, the mini row, today's stats); the end-of-session sound, the lengths' window and the
// save. The markup and the ticking: widgets/pomodoro (a running session lives on in
// models/timer.js through a remount; the ticking stops when the block goes).
import { todayYmd } from "#/helpers/dates.js";
import { readJson } from "#/helpers/files.js";
import { AudioEngine, isMuted } from "#/helpers/sounds.js";
import { Form } from "#/components/uikit/Form/index.ts";
import { app } from "#/helpers/app.js";
import { addStats } from "#/models/timer.js";
import { ASSETS, POMODORO, SOUNDS } from "#/helpers/paths.js";

export const ICON = {
  play: `<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>`,
  pause: `<svg viewBox="0 0 24 24"><path d="M6 5h4v14H6zm8 0h4v14h-4z"/></svg>`,
  // eslint-disable-next-line max-len -- an SVG path
  star: `<svg viewBox="0 0 24 24"><path d="M12 2l2.5 6.5L21 11l-6.5 2.5L12 20l-2.5-6.5L3 11l6.5-2.5z"/></svg>`,
  // eslint-disable-next-line max-len -- an SVG path
  reset: `<svg viewBox="0 0 24 24"><path d="M12 5V2L8 6l4 4V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z"/></svg>`,
  // eslint-disable-next-line max-len -- an SVG path
  gear: `<svg viewBox="0 0 24 24"><path d="M19.14 12.94c.04-.3.06-.61.06-.94s-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.04.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.57 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.21.08-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z"/></svg>`,
  skip: `<svg viewBox="0 0 24 24"><path d="M16 6h2v12h-2zm-3.5 6L4 6v12z"/></svg>`,
};

export const load = () => readJson(POMODORO, {});

// the saved settings, mini and stats, and today's session (another day's starts over)
export async function loadPomodoro() {
  const saved = await load();

  return { saved, current: saved.current?.date === todayYmd() ? saved.current : null };
}

// the end of a session; a meditation's: a slow chime
const sparkle = new AudioEngine(`${ASSETS}/sparkle.wav`);
const chime = new AudioEngine(`${SOUNDS}/snd_pressure_chime.wav`);

export const ding = rate => sparkle.play({ rate });

export const bell = () => chime.play({ rate: 0.7, gain: 0.35, duration: 3 });

// the meditation's music (00 System/Assets/winx music/meditation-<name>.flac, seamless loops):
// the one to play now — "<name>|<start>" for a running meditation with music, not muted — or null
export const MUSIC = { pad: "Pad", bells: "Bells", harp: "Harp" };

export const musicKey = (timer, muted = isMuted()) =>
  timer.type === "meditation" && timer.running && MUSIC[timer.settings.music] && !muted
    ? `${timer.settings.music}|${timer.start}` : null;

// the music to the timer: started (from the session's remaining time, so it fades out at the
// end, before the bell) or stopped; one track at a time, whatever the pomodoros shown
let music = null;   // { key, handle }

export async function syncMusic(timer) {
  const key = musicKey(timer);

  if (music?.key === key) return;
  music?.handle?.stop();
  music = key && { key, handle: null };
  if (!key) return;
  const handle = await new AudioEngine(`${SOUNDS}/meditation-${timer.settings.music}.flac`)
    .loop(timer.remaining);

  if (music?.key === key) music.handle = handle; else handle?.stop();
}

// ⚙: the lengths of the mode on (the pomodoro's focus and break, or the meditation's and its
// music) in the shared window; the settings with them, null when closed or a length isn't above
// zero
export async function askLengths(settings, meditation = false) {
  const rows = meditation
    ? [
      { name: "Meditation", key: "meditationMin", text: "minutes", number: true },
      { name: "Music", key: "music", options: [
        { label: "—", value: null },
        ...Object.entries(MUSIC).map(([value, label]) => ({ label, value })),
      ] },
    ]
    : [
      { name: "Focus", key: "focusMin", text: "minutes", number: true },
      { name: "Break", key: "breakMin", text: "minutes", number: true },
    ];
  const keys = rows.map(r => r.key);
  const v = await Form.ask(app, meditation ? "✦ Meditation" : "✦ Pomodoro", rows,
    { values: settings, required: keys.filter(k => k.endsWith("Min")), submit: "Save" });

  const minutes = keys.filter(k => k.endsWith("Min"));

  return v && minutes.every(k => v[k] > 0)
    ? { ...settings, ...Object.fromEntries(keys.map(k => [k, v[k] ?? null])) } : null;
}

// the save: settings, the current session, mini and today's stats (a finished focus session adds
// its minutes, a meditation its own: `kind`). One save at a time, each reading what the one before
// wrote (a finished session and the ⇄ click at once); the minutes of finished sessions a failed
// save didn't write go with the next save
let queue = Promise.resolve();
const unsaved = [];

export function save({ settings, current, mini }, min = 0, kind = "focus") {
  if (min) unsaved.push({ min, kind });
  const write = queue.then(async () => {
    const sessions = unsaved.splice(0);

    try {
      const data = addStats(await load(), 0, todayYmd());
      Object.assign(data, { settings, current, mini });
      for (const s of sessions) addStats(data, s.min, todayYmd(), s.kind);
      await app.vault.adapter.write(POMODORO, JSON.stringify(data, null, 2));
    } catch (e) {
      unsaved.unshift(...sessions);
      throw e;
    }
  });
  queue = write.catch(() => {});
  return write;
}
