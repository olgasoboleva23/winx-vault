<!-- Pool: by area, the longest since last done first (never done at the top); +📅 adds a copy
     to today -->
<script setup>
import { computed, inject } from "vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";
import GroupCard from "./GroupCard.vue";
import TaskCard from "#/components/pages/calendar/TaskCard/index.vue";
import { byArea } from "#/helpers/panelGroups.js";

const EMPTY_POOL = "New task with «To pool» adds one here";
const view = inject("calendar");

const groups = computed(() => {
  const { model, config } = view.ctx;

  return byArea(model.pool, t => ({ task: view.info(t), meta: model.poolMeta(t) }), config);
});

</script>

<template>
  <WinxEmpty v-if="!groups.length" :text="EMPTY_POOL" />
  <GroupCard v-for="g in groups" :key="g.key" :title="g.title">
    <TaskCard
      v-for="c in g.cards"
      :key="c.task.key"
      :task="c.task"
      :meta="c.meta"
    />
  </GroupCard>
</template>
