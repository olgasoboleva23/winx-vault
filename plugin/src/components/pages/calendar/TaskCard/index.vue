<!-- a card in the bottom panel: its text, a meta line (the meta slot, else `meta`), and the hover
     buttons: the extra slot first, then ⏭ ✏️ 🗑 — or ✏️ 🗑 for a pool item. Dragged onto a day
     (drag.js); swiped right on the phone (swipe.js): ticked and gone at once, a pool item's copy
     added to today -->
<script setup>
import { computed, inject, ref } from "vue";
import TaskText from "#/components/pages/calendar/TaskText.vue";
import TaskButtons from "#/components/pages/calendar/TaskButtons.vue";
import { useDragSource } from "#/composables/drag.js";
import { useSwipe } from "#/composables/swipe.js";

const POOL_EDIT = "edit: difficulty, area, time, sticker, then text";
const props = defineProps({
  task: { type: Object, required: true },
  meta: { type: String, default: "" },
  paused: { type: Boolean, default: false },   // Regulars: a paused 🔁 task, faded
});
const view = inject("calendar");
const gone = ref(false);
const editTitle = computed(() => props.task.pool ? POOL_EDIT : undefined);
const key = () => props.task.key;
const drag = useDragSource(view, key);
const { swipe, ...touch } = useSwipe(view, key, t => {
  if (t.pool) return view.actions.fromPool(t, view.ctx.today, false);
  if (!view.ctx.TASKS) return;
  gone.value = true;
  view.actions.tick(t);
});
</script>

<template>
  <div
    v-if="!gone"
    :class="['winx-task-card', { 'winx-task-card--paused': paused }]"
    :style="{
      '--area': task.color ?? undefined, '--winx-swipe': swipe.dx ? `${swipe.dx}px` : undefined,
    }"
    :data-area="task.area ?? undefined"
    :data-swipe="swipe.kind"
    draggable="true"
    @dragstart="drag.start"
    @dragend="drag.end"
    @touchstart.passive="touch.start"
    @touchmove.passive="touch.move"
    @touchend="touch.end"
  >
    <div class="winx-task-card__text"><TaskText :task="task" /></div>
    <div class="winx-task-card__meta"><slot name="meta">{{ meta }}</slot></div>
    <div class="winx-task-btns">
      <slot name="extra" />
      <TaskButtons :task="task" :edit-title="editTitle" @gone="gone = true" />
    </div>
  </div>
</template>
