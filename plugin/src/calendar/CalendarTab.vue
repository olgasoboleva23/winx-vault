<!-- The calendar tab's page (view.ts mounts it): the header's rows, "Missed?", the days, the bottom panel; the words
     while there's nothing to draw ("waiting for Dataview…") -->
<script setup>
import { computed, inject } from "vue";
import CalendarHeader from "./CalendarHeader.vue";
import CalendarMissed from "./CalendarMissed.vue";
import CalendarGrid from "./CalendarGrid.vue";
import CalendarPanel from "./CalendarPanel.vue";

const view = inject("calendar");
const ctx = computed(() => view.ctx);
const cls = computed(() => `winx-cal winx-cal--${ctx.value.view}`);
</script>

<template>
  <template v-if="ctx.say">{{ ctx.say }}</template>
  <div v-else :class="cls">
    <CalendarHeader />
    <CalendarMissed />
    <CalendarGrid />
    <CalendarPanel />
  </div>
</template>
