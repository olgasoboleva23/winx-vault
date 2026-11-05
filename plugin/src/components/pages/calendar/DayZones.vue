<!-- a day's drop zones while dragging: ✓ (done that day: today and before) and 📅 (planned for
     it) -->
<script setup>
import { computed, inject } from "vue";

const props = defineProps({ day: { type: String, required: true } });
const view = inject("calendar");
const label = computed(() => `📅 ${window.moment(props.day).format("D MMM")}`);
const past = computed(() => props.day <= view.ctx.today);
</script>

<template>
  <div class="winx-cal__zones">
    <div
      v-if="past"
      class="winx-cal__zone winx-cal__zone--done"
      :data-drop="day"
      data-done="1"
    >✓</div>
    <div class="winx-cal__zone winx-cal__zone--plan" :data-drop="day">{{ label }}</div>
  </div>
</template>
