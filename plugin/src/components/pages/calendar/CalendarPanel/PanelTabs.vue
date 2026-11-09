<!-- the panel's tabs, each with its count -->
<script setup>
import { computed, inject } from "vue";
import WinxTabs from "#/components/uikit/WinxTabs/index.vue";

const view = inject("calendar");
const state = view.state;

const tabs = computed(() => {
  const { backlog, regulars, pool, ahead } = view.ctx.model;

  return [
    ["nodate", `No date · ${backlog.length}`],
    ["ahead", `Ahead · ${ahead.flatMap(g => g.items).length}`],
    ["regulars", `Regulars · ${regulars.length}`],
    ["pool", `Pool · ${pool.length}`],
  ].map(([key, text]) => ({ key, text }));
});
</script>

<template>
  <WinxTabs v-model="state.tab" :tabs="tabs" />
</template>
