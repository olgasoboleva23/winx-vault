<!-- a stage's card: its number (01, 02…), name, done/total, ✓ when complete (then it starts
     folded; the fold is this card's own, not saved), its task rows and + task (the New task
     window, then the id onto this stage) -->
<script setup>
import { computed, ref } from "vue";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxCard from "#/components/uikit/WinxCard/index.vue";
import { addToStage } from "#/controllers/projects.js";
import ProjectTask from "./ProjectTask.vue";

const props = defineProps({
  project: { type: String, required: true },
  index: { type: Number, required: true },
  stage: { type: Object, required: true },   // { name, entries: stageTasks' }
});
const done = computed(() => props.stage.entries.filter(e => e.done).length);
const total = computed(() => props.stage.entries.length);
const complete = computed(() => total.value > 0 && done.value === total.value);
const folded = ref(complete.value);
</script>

<template>
  <WinxCard :class="['winx-project__stage', { 'winx-project__stage--folded': folded }]">
    <div class="winx-project__stage-head winx-row winx-gap-m">
      <span class="winx-project__stage-num">{{ String(index + 1).padStart(2, "0") }}</span>
      <span class="winx-project__stage-name winx-grow">{{ stage.name }}</span>
      <span class="winx-project__stage-count">{{ done }}/{{ total }}</span>
      <span v-if="complete" class="winx-project__stage-done">✓</span>
      <WinxButton
        kind="text"
        class="winx-project__fold"
        :title="folded ? 'Show tasks' : 'Hide tasks'"
        @click="folded = !folded"
      >{{ folded ? "⌄" : "⌃" }}</WinxButton>
    </div>
    <template v-if="!folded">
      <ProjectTask v-for="e in stage.entries" :key="e.id" :entry="e" />
      <WinxButton
        kind="text"
        class="winx-project__add"
        @click="addToStage(project, index, stage.name)"
      >+ task</WinxButton>
    </template>
  </WinxCard>
</template>
