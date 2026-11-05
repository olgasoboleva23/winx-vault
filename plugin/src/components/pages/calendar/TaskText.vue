<!-- a task's difficulty stars (in the area's colour), its text, its stickers (withIcon: the area's
     icon in front) -->
<script setup>
import { computed } from "vue";

const props = defineProps({
  task: { type: Object, required: true },
  withIcon: { type: Boolean, default: false },
});
const text = computed(() => props.withIcon ? props.task.label : props.task.text);
</script>

<template>
  <span
    v-if="task.difficulty"
    class="tag"
    :data-tag-name="task.difficulty"
    title="difficulty"
  />
  {{ text }}
  <img
    v-for="(src, i) in task.stickers"
    :key="i"
    class="winx-cal__sticker"
    :src="src"
    alt=""
  >
</template>
