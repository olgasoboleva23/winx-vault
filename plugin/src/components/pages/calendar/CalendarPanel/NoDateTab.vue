<!-- No date: longest-waiting first (➕ created); 8 of them until "show all" (the panel's button) -->
<script setup>
import { computed, inject } from "vue";
import GroupCard from "./GroupCard.vue";
import TaskCard from "../TaskCard/index.vue";
import { SHOWN, byArea } from "../../../../helpers/panelGroups.js";

const view = inject("calendar");

const groups = computed(() => {
  const { model, config } = view.ctx, { backlog } = model;
  const cut = backlog.length > SHOWN && !view.state.backlogOpen;
  const card = t => ({ task: view.info(t), meta: model.backlogMeta(t) });

  return byArea(cut ? backlog.slice(0, SHOWN) : backlog, card, config);
});
</script>

<template>
  <GroupCard v-for="g in groups" :key="g.key" :title="g.title">
    <TaskCard
      v-for="c in g.cards"
      :key="c.task.key"
      :task="c.task"
      :meta="c.meta"
    />
  </GroupCard>
</template>
