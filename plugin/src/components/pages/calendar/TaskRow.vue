<!-- a task in a day: kind open | ghost (a 🔁 repeat to come) | done. The week has a checkbox
     (tick: the Tasks plugin is there) and, for an open one, the hover buttons and swipes; the
     month only the text (its title: the label). after: it comes after the row above it
     (#after/id/<id>), a ↳ in front. A tick waits 2 s (struck, a gold shimmer) before it's
     written — even if the calendar draws again meanwhile; unticked in time: nothing. The sound
     comes from installSounds (it listens to every .task-list-item-checkbox) -->
<script setup>
import { computed, inject, ref } from "vue";
import TaskText from "./TaskText.vue";
import TaskButtons from "./TaskButtons.vue";

const props = defineProps({
  task: { type: Object, required: true },
  kind: { type: String, required: true },
  compact: { type: Boolean, default: false },
  tick: { type: Boolean, default: false },
  after: { type: Boolean, default: false },
});
const view = inject("calendar");
const ticking = ref(false), done = ref(false), gone = ref(false);
const box = computed(() => !props.compact && props.tick && props.kind !== "ghost");
const live = computed(() => !props.compact && props.kind === "open");
const drags = computed(() => props.kind !== "ghost");   // a ghost (a 🔁 day ahead) isn't dragged
const repeat = computed(() => props.kind === "ghost" ? "🔁 " : "");

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
    :class="[
      'winx-cal__task',
      `winx-cal__task--${kind}`,
      { 'winx-cal__task--ticking': ticking, 'winx-cal__task--done': done },
    ]"
    :data-area="task.area"
    :data-task="task.key"
    :draggable="drags ? 'true' : null"
    :data-drag="drags ? task.key : null"
    :data-swipeable="live && box ? task.key : null"
    :title="compact ? task.label : null"
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
        type="checkbox"
        class="task-list-item-checkbox"
        aria-label="done"
        data-action="tick"
        :disabled="done"
        @change="onTick"
      >
    </template>{{ repeat }}<TaskText :task="task" />
    <div v-if="live && !done" class="winx-task-btns">
      <TaskButtons :task="task" @gone="gone = true" />
    </div>
  </div>
</template>
