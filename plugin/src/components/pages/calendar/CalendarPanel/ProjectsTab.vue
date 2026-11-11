<!-- Projects: a card per project that isn't done, a stage's name over its open tasks -->
<script setup>
import { computed, inject } from "vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";
import GroupCard from "./GroupCard.vue";
import TaskCard from "#/components/pages/calendar/TaskCard/index.vue";
import { T } from "#/models/calendarData.js";
import { openProjects } from "#/helpers/panelGroups.js";

const EMPTY_PROJECTS = "Projects are kept in projects.json";
const view = inject("calendar");

const projects = computed(() => openProjects().map(p => ({
  ...p,
  stages: p.stages.map(s => ({
    name: s.name,
    cards: s.entries.map(e => ({
      task: view.info(e.t), meta: T(e.t).date ? `📅 ${T(e.t).date}` : "",
    })),
  })),
})));
</script>

<template>
  <WinxEmpty v-if="!projects.length" :text="EMPTY_PROJECTS" />
  <GroupCard v-for="p in projects" :key="p.key" :title="p.title">
    <template v-for="s in p.stages" :key="s.name">
      <div class="winx-cal__stage">{{ s.name }}</div>
      <TaskCard
        v-for="c in s.cards"
        :key="c.task.key"
        :task="c.task"
        :meta="c.meta"
      />
    </template>
  </GroupCard>
</template>
