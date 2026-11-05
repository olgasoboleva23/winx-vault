<!-- The calendar tab's page (view.ts mounts it): the header's rows, "Missed?", the days, the bottom
     panel; the words while there's nothing to draw ("waiting for Dataview…") -->
<script setup>
import { computed, inject } from "vue";
import CalendarHeader from "../CalendarHeader/index.vue";
import CalendarMissed from "../CalendarMissed/index.vue";
import CalendarGrid from "../CalendarGrid/index.vue";
import CalendarPanel from "../CalendarPanel/index.vue";

const view = inject("calendar");
const ctx = computed(() => view.ctx);
</script>

<template>
  <template v-if="ctx.say">{{ ctx.say }}</template>
  <div v-else :class="['winx-cal', `winx-cal--${ctx.view}`]">
    <CalendarHeader />
    <CalendarMissed />
    <CalendarGrid />
    <CalendarPanel />
  </div>
</template>
