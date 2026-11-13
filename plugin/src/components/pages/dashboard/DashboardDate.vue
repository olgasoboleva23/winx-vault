<!-- The dashboard's date row (where the note had the Meta Bind field): the date field, ‹ ›, "today"
     when another day shows. @go(date): another day (null: today) -->
<script setup>
import { addDays } from "#/helpers/dates.js";
import WinxButton from "#/components/uikit/WinxButton/index.vue";

const props = defineProps({
  date: { type: String, required: true },    // the day it shows
  today: { type: String, required: true },
  phone: { type: Boolean, default: false },
});
const emit = defineEmits(["go"]);
const step = n => emit("go", addDays(props.date, n));
const typed = e => emit("go", e.target.value || null);   // emptied (the phone's "Reset"): today
const label = props.phone ? "☀️" : "today";
</script>

<template>
  <div class="mb-input-type-date"><input type="date" :value="date" @change="typed"></div>
  <WinxButton kind="nav" title="previous" @click="step(-1)">‹</WinxButton>
  <WinxButton
    kind="nav"
    title="next"
    mirrored
    @click="step(1)"
  >›</WinxButton>
  <WinxButton
    v-if="date !== today"
    kind="chip"
    title="today"
    @click="emit('go', null)"
  >{{ label }}</WinxButton>
</template>
