<!-- "Missed?": open tasks whose day has passed, only while today is on screen; a row's ✓ (done on
     its day, with Tasks) or ☀️ (moved to today) takes it off at once, the write follows. A row is
     dragged onto a day (drag.js); swiped right on the phone (swipe.js): its ✓ -->
<script setup>
import { computed, inject, reactive, watch } from "vue";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import TaskText from "#/components/pages/calendar/TaskText.vue";
import TaskButtons from "#/components/pages/calendar/TaskButtons.vue";
import { T } from "#/models/calendarData.js";
import { dm } from "#/helpers/dates.js";
import { AudioEngine } from "#/helpers/sounds.js";
import { ASSETS, SOUNDS } from "#/helpers/paths.js";
import { useDragSource } from "#/composables/drag.js";
import { useSwipe } from "#/composables/swipe.js";

const view = inject("calendar");
const ctx = computed(() => view.ctx);
const sounds = {
  done: new AudioEngine(`${SOUNDS}/snd_pickup_gem02.wav`),
  today: new AudioEngine(`${ASSETS}/star.wav`),
};
const gone = reactive(new Set());   // rows taken off until the new data comes
watch(ctx, () => gone.clear());
const rows = computed(() => {
  const { days, today, model: { missed }, TASKS } = ctx.value;

  if (!days.includes(today)) return [];
  return missed.map(t => {
    const task = view.info(t), day = T(t).date, key = () => task.key;
    const r = {
      t, task, day, shortDay: dm(day), repeats: T(t).isRecurring ? "🔁 " : "", done: !!TASKS,
      drag: useDragSource(view, key),
    };

    r.sw = useSwipe(view, key, () => r.done && doneOnItsDay(r));
    return r;
  }).filter(r => !gone.has(r.task.key));
});

function act(r, sound, write) {
  const t = view.task(r.task.key);

  if (!t) return;
  gone.add(r.task.key);
  sound.play({ gain: 0.25 });
  return write(t);
}

const doneOnItsDay = r => act(r, sounds.done, t => view.actions.doneOnItsDay(t));
const toToday = r => act(r, sounds.today, t => view.actions.toToday(t));
</script>

<template>
  <div v-if="rows.length" class="winx-missed" data-part="missed">
    <div class="winx-missed__head">Missed?</div>
    <div
      v-for="r in rows"
      :key="r.task.key"
      class="winx-missed__row winx-row winx-gap-s"
      :style="r.sw.swipe.dx ? { '--winx-swipe': `${r.sw.swipe.dx}px` } : null"
      :data-area="r.task.area ?? undefined"
      :data-swipe="r.sw.swipe.kind"
      draggable="true"
      @dragstart="r.drag.start"
      @dragend="r.drag.end"
      @touchstart.passive="r.sw.start"
      @touchmove.passive="r.sw.move"
      @touchend="r.sw.end"
    >
      <span class="winx-missed__text winx-grow">{{ r.repeats }}<TaskText :task="r.task" /></span>
      <div class="winx-task-btns"><TaskButtons :task="r.task" @gone="gone.add(r.task.key)" /></div>
      <em class="winx-missed__date">{{ r.shortDay }}</em>
      <WinxButton v-if="r.done" :title="`done on ${r.day}`" @click="doneOnItsDay(r)">✓</WinxButton>
      <WinxButton title="move to today" @click="toToday(r)">☀️</WinxButton>
    </div>
  </div>
</template>
