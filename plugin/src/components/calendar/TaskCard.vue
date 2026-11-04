<!-- a card in the bottom panel: its text, a meta line (the meta slot, else `meta`), and the hover buttons: the
     extra slot first, then ⏭ ✏️ 🗑 — or ✏️ 🗑 for a pool item -->
<script setup>
import { computed, ref } from "vue";
import TaskText from "./TaskText.vue";
import TaskButtons from "./TaskButtons.vue";
const POOL_EDIT = "edit: difficulty, area, time, sticker, then text";
const props = defineProps({
  task: { type: Object, required: true },
  meta: { type: String, default: "" },
  cls: { type: String, default: null },
});
const gone = ref(false);
const editTitle = computed(() => props.task.pool ? POOL_EDIT : undefined);
</script>

<template>
  <div
    v-if="!gone"
    :class="['winx-task-card', cls]"
    :data-area="task.area ?? undefined"
    draggable="true"
    :data-task="task.key"
    :data-drag="task.key"
    :data-swipeable="task.key"
  >
    <div class="winx-task-card__text"><TaskText :task="task" /></div>
    <div class="winx-task-card__meta"><slot name="meta">{{ meta }}</slot></div>
    <div class="winx-task-btns">
      <slot name="extra" />
      <TaskButtons :task="task" :edit-title="editTitle" @gone="gone = true" />
    </div>
  </div>
</template>
