<script setup>
import { computed, inject, provide } from "vue";
import { taskStore } from "#/store/tasks.js";
import ProjectList from "./ProjectList/index.vue";
import ProjectPage from "./ProjectPage/index.vue";

const props = defineProps({ state: { type: Object, required: true } });
const winx = inject("winx");
const view = { state: props.state, version: taskStore.version,
  open: (key, e) => winx.go("projects", { open: key }, e) };
provide("projects", view);
const open = computed(() => {
  void view.version.value;
  return taskStore.projects.has(view.state.open);
});
</script>

<template>
  <div class="winx-view__page markdown-preview-view markdown-rendered dashboard">
    <ProjectPage v-if="open" />
    <ProjectList v-else />
  </div>
</template>
