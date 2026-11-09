<!-- Quests: the tab's day, what is left of its plan (open tasks due that day), then what was done
     that day; a box ticks a task through the Tasks plugin, a done one's box takes it back -->
<script setup>
import WinxCheckbox from "#/components/uikit/WinxCheckbox/index.vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";
import { tickTask } from "#/controllers/tasks.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="winx-quests">
    <WinxEmpty
      v-if="!state.data.open.length && !state.data.done.length"
      text="Nothing planned for this day"
    />
    <div
      v-for="r in [...state.data.open, ...state.data.done]"
      :key="r.key"
      class="winx-quests__row winx-row winx-gap-s"
      :class="r.done && 'winx-quests__row--done'"
    >
      <WinxCheckbox
        :mark="r.done ? '✅' : '☐'"
        size="s"
        @tick="tickTask(r.t)"
      />
      <span class="winx-quests__label">{{ r.label }}</span>
    </div>
  </div>
</template>
