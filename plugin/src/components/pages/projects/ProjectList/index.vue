<!-- The projects' list (block winx-projects): the title, ✦ New project, a tab per status with
     its count, then a card per project in file order: its cover, name, status, description,
     progress (none without tasks) and next task (the first open one of the first stage not
     complete), its box ticks it; a click elsewhere on the card opens the project -->
<script setup>
import { computed, inject } from "vue";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxCard from "#/components/uikit/WinxCard/index.vue";
import WinxCheckbox from "#/components/uikit/WinxCheckbox/index.vue";
import WinxProgress from "#/components/uikit/WinxProgress/index.vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";
import WinxTabs from "#/components/uikit/WinxTabs/index.vue";
import { app } from "#/helpers/app.js";
import { tasksApi } from "#/helpers/plugins.js";
import { askNewProject } from "#/controllers/projects.js";
import { tickTask } from "#/controllers/tasks.js";
import { T } from "#/models/calendarData.js";
import { stageTasks, taskStore } from "#/store/tasks.js";
import { FILTERS } from "#/store/projects.js";
import { coverUrl } from "../cover.js";
import ProjectStatus from "../ProjectStatus/index.vue";

const projects = inject("projects");
const state = projects.state;
const label = s => `${s[0].toUpperCase()}${s.slice(1)}`;

// every project as its card shows it (read again when the tasks or projects change)
const all = computed(() => {
  void projects.version.value;
  return [...taskStore.projects].map(([key, p]) => {
    const entries = (p.stages ?? []).flatMap(stageTasks);
    const next = entries.find(e => !e.done);

    return {
      key, name: p.name, status: p.status, description: p.description, cover: coverUrl(p, app),
      done: entries.filter(e => e.done).length, total: entries.length,
      next: next && { t: next.t, text: T(next.t).text },
    };
  });
});
const shown = computed(() =>
  all.value.filter(p => state.filter === "all" || p.status === state.filter));
const tabs = computed(() => FILTERS.map(f => ({
  key: f,
  text: `${label(f)} · ${
    f === "all" ? all.value.length : all.value.filter(p => p.status === f).length}`,
})));
const canTick = computed(() => { void projects.version.value; return !!tasksApi(); });
</script>

<template>
  <div class="winx-projects">
    <div class="winx-projects__header winx-row winx-between winx-wrap winx-gap-m">
      <div class="winx-row winx-gap-m">
        <h1 class="winx-projects__title">Projects</h1>
        <WinxButton kind="chip" @click="askNewProject(app)">✦ New project</WinxButton>
      </div>
      <WinxTabs v-model="state.filter" :tabs="tabs" photo />
    </div>
    <WinxEmpty v-if="!all.length" text="No projects yet" />
    <WinxEmpty
      v-else-if="!shown.length"
      :text="`No ${label(state.filter).toLowerCase()} projects`"
    />
    <div class="winx-projects__grid">
      <WinxCard
        v-for="p in shown"
        :key="p.key"
        :wings="false"
        class="winx-projects__card"
        :title="p.name"
        :cover="p.cover"
        @click="projects.open(p.key, $event)"
      >
        <template #button>
          <ProjectStatus :status="p.status" />
        </template>
        <div v-if="p.description" class="winx-projects__description">{{ p.description }}</div>
        <WinxProgress v-if="p.total" :value="p.done" :max="p.total" />
        <div v-if="p.next" class="winx-projects__next winx-row winx-gap-s" @click.stop>
          <WinxCheckbox :static="!canTick" @tick="tickTask(p.next.t)" />
          <span class="winx-projects__next-text">{{ p.next.text }}</span>
        </div>
      </WinxCard>
    </div>
  </div>
</template>
