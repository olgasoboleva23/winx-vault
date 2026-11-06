<!-- a day's drop zones while dragging (drag.js): ✓ (done that day: today and before) and 📅
     (planned for it) -->
<script setup>
import { computed, inject } from "vue";
import { useDropZone } from "#/composables/drag.js";

const props = defineProps({ day: { type: String, required: true } });
const view = inject("calendar");
const label = computed(() => `📅 ${window.moment(props.day).format("D MMM")}`);
const past = computed(() => props.day <= view.ctx.today);
const done = useDropZone(view, () => props.day, true);
const plan = useDropZone(view, () => props.day);
</script>

<template>
  <div class="winx-cal__zones">
    <div
      v-if="past"
      :class="['winx-cal__zone winx-cal__zone--done winx-grow winx-center',
               { 'winx-cal__zone--over': done.over }]"
      @dragover="done.enter"
      @dragleave="done.leave"
      @drop="done.drop"
    >✓</div>
    <div
      :class="['winx-cal__zone winx-cal__zone--plan winx-grow winx-center',
               { 'winx-cal__zone--over': plan.over }]"
      @dragover="plan.enter"
      @dragleave="plan.leave"
      @drop="plan.drop"
    >{{ label }}</div>
  </div>
</template>
