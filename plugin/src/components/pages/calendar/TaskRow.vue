<!-- a task in a day: kind open | ghost (a 🔁 repeat to come) | done. The week has a checkbox
     (tick: the Tasks plugin is there) and, for an open one, the hover buttons and swipes; the
     month only the text (its title: the label). after: it comes after the row above it
     (#after/id/<id>), a ↳ in front. A tick waits 2 s (struck, a gold shimmer) before it's
     written — even if the calendar draws again meanwhile; unticked in time: nothing. The sound
     comes from installSounds (it listens to every .task-list-item-checkbox). The row is dragged
     onto a day or the panel, and an open one is a reorder target in its day (drag.js); on the
     phone it's swiped (swipe.js): right ticks its checkbox -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";
import { computed, inject, ref } from "vue";
import TaskText from "./TaskText.vue";
import TaskButtons from "./TaskButtons.vue";
import { useDragSource, useReorder } from "#/composables/drag.js";
import { useSwipe } from "#/composables/swipe.js";

const props = defineProps({
  task: { type: Object, required: true },
  kind: { type: String, required: true },
  day: { type: String, default: null },   // the day it's in
  compact: { type: Boolean, default: false },
  tick: { type: Boolean, default: false },
  after: { type: Boolean, default: false },
});
const view = inject("calendar");
const ticking = ref(false), done = ref(false), gone = ref(false), input = ref(null);
const box = computed(() => !props.compact && props.tick && props.kind !== "ghost");
const live = computed(() => !props.compact && props.kind === "open");
const drags = computed(() => props.kind !== "ghost");   // a ghost (a 🔁 day ahead) isn't dragged
const repeat = computed(() => props.kind === "ghost" ? "🔁 " : "");
const key = () => props.task.key;
const drag = useDragSource(view, key, () => props.day);
const onto = useReorder(view, key, () => props.kind === "open" ? props.day : null);
const { swipe, ...touch } = useSwipe(view, key,
  () => input.value.checked || input.value.click(), () => live.value && box.value);

// ticked: written 2 s later (unticked in time: nothing); the wait is the tab's (view.waits), so a
// redraw doesn't drop it, and a closed tab does
function onTick(e) {
  ticking.value = e.target.checked;
  const t = e.target.checked && view.task(props.task.key);

  if (!t) return view.waits.cancel(props.task.key);
  view.waits.later(props.task.key, () => {
    done.value = true;
    view.actions.tick(t);
  }, 2000);
}
</script>

<template>
  <div
    v-if="!gone"
    v-tip="compact ? task.label : null"
    :class="[
      'winx-cal__task',
      `winx-cal__task--${kind}`,
      onto.mark && `winx-cal__task--drop-${onto.mark}`,
      { 'winx-cal__task--ticking': ticking, 'winx-cal__task--done': done },
    ]"
    :style="swipe.dx ? { '--winx-swipe': `${swipe.dx}px` } : null"
    :data-area="task.area"
    :data-goal="task.goal || null"
    :data-swipe="swipe.kind"
    :draggable="drags ? 'true' : null"
    @dragstart="drag.start"
    @dragend="drag.end"
    @dragover="onto.over"
    @dragleave="onto.leave"
    @drop="onto.drop"
    @touchstart.passive="touch.start"
    @touchmove.passive="touch.move"
    @touchend="touch.end"
  >
    <span v-if="after" class="winx-cal__after">↳</span>
    <template v-if="box">
      <input
        v-if="kind === 'done'"
        type="checkbox"
        class="task-list-item-checkbox"
        aria-label="done"
        checked
        disabled
      >
      <input
        v-else
        ref="input"
        type="checkbox"
        class="task-list-item-checkbox"
        aria-label="done"
        :disabled="done"
        @change="onTick"
      >
    </template>{{ repeat }}<TaskText :task="task" />
    <div v-if="live && !done" class="winx-task-btns">
      <TaskButtons :task="task" @gone="gone = true" />
    </div>
  </div>
</template>
