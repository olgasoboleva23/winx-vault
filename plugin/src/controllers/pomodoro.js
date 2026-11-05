// The writes of the pomodoro: pomodoro.json (settings, the current session, mini, today's stats),
// with the block's end-of-session sound and the lengths' window.
import { todayYmd } from "../core/dates.js";
import { AudioEngine } from "../core/sounds.js";
import { Form } from "../uikit/form.ts";
import { app } from "../core/app.js";
import { addStats } from "../widgets/pomodoro/timer.js";
import { PATH, load } from "../widgets/pomodoro/pomodoro.js";

// the block's sound (one per block), the lengths' window, and the save: settings, the current
// session, mini and today's stats (a finished focus session adds its minutes)
export function pomodoroActions() {
  const sound = new AudioEngine("00 System/Assets/sparkle.wav");

  return {
    ding: rate => sound.play({ rate }),
    // ⚙: the session lengths in the shared window; null when closed or not both set
    lengths: async settings => {
      const v = await Form.ask(app, "✦ Pomodoro", [
        { name: "Focus", key: "focusMin", text: "minutes", number: true },
        { name: "Break", key: "breakMin", text: "minutes", number: true },
      ], { values: settings, required: ["focusMin", "breakMin"], submit: "Save" });

      const ok = v?.focusMin > 0 && v.breakMin > 0;

      return ok ? { focusMin: v.focusMin, breakMin: v.breakMin } : null;
    },
    save: async ({ settings, current, mini }, focusMin = 0) => {
      const data = await load();
      Object.assign(data, { settings, current, mini });
      addStats(data, focusMin, todayYmd());
      await app.vault.adapter.write(PATH, JSON.stringify(data, null, 2));
    },
  };
}
