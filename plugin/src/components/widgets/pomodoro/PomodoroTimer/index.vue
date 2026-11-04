<!-- Pomodoro: the small row (a ring, the time, the mode and stars, ▶) that opens into the full ring
     (click the time): ↺ ▶ ⏭, the mode and session, the stars, the lengths and ⚙. The Timer ticks
     once a second here, and at once when the window is back (a background window's timers run
     late); the end of a running session starts the next. The Timer and its clock live here;
     PomodoroMini and PomodoroRing draw what `shown` says. -->
<script setup>
import { onBeforeUnmount, onMounted, reactive, ref } from "vue";
import { Timer } from "../../../../widgets/pomodoro/timer.js";
import PomodoroMini from "./PomodoroMini.vue";
import PomodoroRing from "./PomodoroRing.vue";

const props = defineProps({
  state: { type: Object, required: true },
  actions: { type: Object, required: true },
});

const { saved, current } = props.state.data;
const timer = new Timer(saved.settings, current);
const mini = ref(saved.mini ?? true);

// what the clock shows: set by tick()
const shown = reactive({
  time: "--:--", p: 0, mode: "", session: "", lengths: "", running: false, filled: 0, sets: "",
});

function tick() {
  const { filled, sets } = timer.stars;
  Object.assign(shown, {
    time: timer.clock,
    p: 1 - timer.remaining / timer.duration,
    mode: timer.type === "focus" ? "Focus" : "Break",
    session: `Session ${timer.sessions + 1}`,
    lengths: `${timer.settings.focusMin}m · ${timer.settings.breakMin}m`,
    running: timer.running,
    filled,
    sets: sets > 0 ? `×${sets}` : "",
  });
}

let ending = 0, every = 0;
const save = (focusMin = 0) => props.actions.save(
  { settings: timer.settings, current: timer.current, mini: mini.value },
  focusMin,
);

// the end of a running session: the next one starts by itself
function arm() {
  window.clearTimeout(ending);
  if (timer.running) ending = window.setTimeout(finish, timer.remaining);
}

async function finish() {
  const focusMin = timer.settings.focusMin, wasFocus = timer.next();
  props.actions.ding(timer.type === "focus" ? 1.0 : 0.8);
  timer.play(); arm(); tick();
  await save(wasFocus ? focusMin : 0);
}

async function act(change) { change(timer); arm(); tick(); await save(); }

const play = () => act(t => t.running ? t.pause() : t.play());
const reset = () => act(t => t.reset());
const skip = () => act(t => t.reset(t.other));   // to the next session, this one not counted

// the small row ⇄ the full ring; kept in the json
const toggle = () => { mini.value = !mini.value; void save(); };

async function gear() {
  const lengths = await props.actions.lengths(timer.settings);

  if (lengths) await act(t => { t.settings = lengths; t.reset(); });
}

const back = () => document.hidden || tick();
onMounted(() => {
  arm(); tick();
  every = window.setInterval(tick, 1000);
  document.addEventListener("visibilitychange", back);
  window.addEventListener("focus", tick);
});
onBeforeUnmount(() => {
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
    />
  </div>
</template>
