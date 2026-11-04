<!-- the panel's tabs, each with its count -->
<script setup>
import { computed, inject } from "vue";

const view = inject("calendar");
const state = view.state;

const tabs = computed(() => {
  const { backlog, regulars, pool, ahead } = view.ctx.model;
  return [
    ["nodate", `No date · ${backlog.length}`],
    ["ahead", `Ahead · ${ahead.flatMap(g => g.items).length}`],
    ["regulars", `Regulars · ${regulars.length}`],
    ["pool", `Pool · ${pool.length}`],
  ].map(([key, text]) => ({ key, text, on: key === state.tab }));
});

const setTab = key => { state.tab = key; };
</script>

<template>
  <div class="winx-cal__tabs">
    <button
      v-for="t in tabs"
      :key="t.key"
      :class="['winx-cal__tab', { 'winx-cal__tab--on': t.on }]"
      :data-tab="t.key"
      @click="setTab(t.key)"
    >{{ t.text }}</button>
  </div>
</template>
