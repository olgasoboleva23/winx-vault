<!-- Pomodoro: the small row (a ring, the time, the mode and stars, ▶) that opens into the full ring
     (click the time): ↺ ▶ ⏭, the mode and session, the stars, the lengths and ⚙. The Timer ticks
     once a second here, and at once when the window is back (a background window's timers run
     late); the end of a running session starts the next; while one runs the screen stays on
     (helpers/wakeLock.js). The Timer and its clock live here;
     PomodoroMini and PomodoroRing draw what `shown` says. -->
<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { Notice } from "obsidian";
import { Timer, listen } from "#/models/timer.js";
import {
  askLengths, bell, ding, save as write, syncMusic,
} from "#/controllers/widgets/pomodoro.js";
import { keepAwake } from "#/helpers/wakeLock.js";
import PomodoroMini from "./PomodoroMini.vue";
import PomodoroRing from "./PomodoroRing.vue";

const props = defineProps({ state: { type: Object, required: true } });

const { saved, current } = props.state.data;
const timer = new Timer(saved.settings, current);
const mini = ref(saved.mini ?? true);

// what the clock shows: set by tick()
const shown = reactive({
  time: "--:--", p: 0, mode: "", session: "", lengths: "", running: false, filled: 0, sets: "",
  meditation: false,
});
const MODE = { focus: "Focus", break: "Break", meditation: "Meditation" };

function tick() {
  const { filled, sets } = timer.stars, meditation = timer.type === "meditation";
  const { focusMin, breakMin, meditationMin } = timer.settings;

  Object.assign(shown, {
    time: timer.clock,
    p: 1 - timer.remaining / timer.duration,
    mode: MODE[timer.type],
    session: meditation ? "" : `Session ${timer.sessions + 1}`,
    lengths: meditation ? `${meditationMin}m` : `${focusMin}m · ${breakMin}m`,
    meditation,
    running: timer.running,
    filled,
    sets: sets > 0 ? `×${sets}` : "",
  });
  void keepAwake(timer.running);   // a running session keeps the screen on, the Mac awake
  void syncMusic(timer);   // a running meditation's music on, else off
}

let ending = 0, every = 0, unlisten;
const save = (min = 0, kind = "focus") => write(
  { settings: timer.settings, current: timer.current, mini: mini.value },
  min, kind,
);

// the end of a running session: the next one starts by itself
function arm() {
  window.clearTimeout(ending);
  if (timer.running) ending = window.setTimeout(finish, timer.remaining);
}

// a meditation ends with the bell and stops; a pomodoro's session starts the next
async function finish() {
  const was = timer.type, min = was === "break" ? 0 : timer.duration / 60_000;

  timer.next();
  if (was === "meditation") bell();
  else { ding(timer.type === "focus" ? 1.0 : 0.8); timer.play(); }

  timer.share(); arm(); tick();
  // no click to hand the error to: said here (the minutes go with the next save)
  await save(min, was).catch(e => {
    console.error(e);
    new Notice("Pomodoro: not saved, the next save will try again");
  });
}

async function act(change) { change(timer); timer.share(); arm(); tick(); await save(); }

// another pomodoro shown (a second tab) changed the session: shown here at once, its end re-armed
// (so it ends and counts once, there)
const follow = t => { if (t !== timer) { timer.take(t); arm(); tick(); } };

const play = () => act(t => t.running ? t.pause() : t.play());
const reset = () => act(t => t.reset());
const skip = () => act(t => t.reset(t.other));   // to the next session, this one not counted
// 🧘 the pomodoro ⇄ the meditation, the session on stopped
const switchMode = () => act(t => t.reset(t.type === "meditation" ? "focus" : "meditation"));

// the small row ⇄ the full ring; kept in the json
const toggle = () => { mini.value = !mini.value; return save(); };

async function gear() {
  const lengths = await askLengths(timer.settings, timer.type === "meditation");

  if (lengths) await act(t => { t.settings = lengths; t.reset(); });
}

const back = () => document.hidden || tick();
onMounted(() => {
  unlisten = listen(follow);
  arm(); tick();
  every = window.setInterval(tick, 1000);
  document.addEventListener("visibilitychange", back);
  window.addEventListener("focus", tick);
});
onBeforeUnmount(() => {
  unlisten();
  void keepAwake(false);
  window.clearInterval(every);
  window.clearTimeout(ending);
  document.removeEventListener("visibilitychange", back);
  window.removeEventListener("focus", tick);
});
</script>

<template>
  <div :class="['winx-pomodoro', { 'winx-pomodoro--mini': mini }]">
    <PomodoroMini :shown="shown" @toggle="toggle" @play="play" />
    <PomodoroRing
      :shown="shown"
      @toggle="toggle"
      @play="play"
      @reset="reset"
      @skip="skip"
      @gear="gear"
      @mode="switchMode"
    />
  </div>
</template>
