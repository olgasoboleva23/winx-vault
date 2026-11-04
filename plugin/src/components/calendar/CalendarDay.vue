<!-- a day as a column (the week) or a card (under the phone's month): its heading, its tasks, its
     drop zones -->
<script setup>
import { computed, inject } from "vue";
import DayFill from "./DayFill.vue";
import DayZones from "./DayZones.vue";

const props = defineProps({
  day: { type: String, required: true },
  format: { type: String, required: true },
});
const view = inject("calendar");
const head = computed(() => window.moment(props.day).format(props.format));
const today = computed(() => props.day === view.ctx.today);
</script>

<template>
  <div :class="['winx-cal__day', { 'winx-cal__day--today': today }]">
    <div class="winx-cal__head">{{ head }}</div>
    <DayFill :day="day" />
    <DayZones :day="day" />
  </div>
</template>
