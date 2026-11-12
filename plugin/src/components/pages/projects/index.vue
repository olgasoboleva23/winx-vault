<!-- The Projects tab's page (view.ts mounts it): the list of projects; a project's page when
     state.open names one in the store (one deleted meanwhile: the list) -->
<script setup>
import { computed, inject } from "vue";
import { taskStore } from "#/store/tasks.js";
import ProjectList from "./ProjectList/index.vue";
import ProjectPage from "./ProjectPage/index.vue";

const view = inject("projects");
const open = computed(() => {
  void view.version.value;
  return taskStore.projects.has(view.state.open);
});
</script>

<template>
  <ProjectPage v-if="open" />
  <ProjectList v-else />
</template>
