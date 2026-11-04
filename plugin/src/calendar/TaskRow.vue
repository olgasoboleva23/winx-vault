<!-- a task in a day: kind open | ghost (a 🔁 repeat to come) | done. The week has a checkbox (tick: the Tasks plugin
     is there) and, for an open one, the hover buttons and swipes; the month only the text (its title: the label).
     after: it comes after the row above it (#after/id/<id>), a ↳ in front. A tick waits 2 s (struck, a gold
     shimmer) before it's written — even if the calendar draws again meanwhile; unticked in time: nothing.
     The sound comes from installSounds (it listens to every .task-list-item-checkbox) -->
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
let timer = 0;
const box = computed(() => !props.compact && props.tick && props.kind !== "ghost");
const live = computed(() => !props.compact && props.kind === "open");
const cls = computed(() => ["winx-cal__task", `winx-cal__task--${props.kind}`,
  { "winx-cal__task--ticking": ticking.value, "winx-cal__task--done": done.value }]);
const attrs = computed(() => ({
  "data-area": props.task.area ?? undefined,
  "data-task": props.task.key,
  ...(props.kind !== "ghost" ? { draggable: "true", "data-drag": props.task.key } : {}),
  ...(live.value && box.value ? { "data-swipeable": props.task.key } : {}),
  ...(props.compact ? { title: props.task.label } : {}),
}));
const repeat = computed(() => props.kind === "ghost" ? "🔁 " : "");
function onTick(e) {
  ticking.value = e.target.checked;
  window.clearTimeout(timer);
  const t = e.target.checked && view.task(props.task.key);
  if (t) timer = window.setTimeout(() => { done.value = true; view.actions.tick(t); }, 2000);
}
</script>

<template>
  <div v-if="!gone" :class="cls" v-bind="attrs">
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
    <div v-if="live && !done" class="winx-task-btns"><TaskButtons :task="task" @gone="gone = true" /></div>
  </div>
</template>
