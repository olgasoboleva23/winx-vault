<!-- The dashboard's date row (where the note had the Meta Bind field): the date field, ‹ ›, "today" when another
     day shows, and 📅 to the calendar on the phone only (its tabs are out of sight). @go(date): another day
     (null: today), @calendar: open the calendar -->
<script setup>
import { addDays } from "../../core/dates.js";
import WinxButton from "../uikit/WinxButton.vue";
const props = defineProps({
  date: { type: String, required: true },    // the day it shows
  today: { type: String, required: true },
  phone: { type: Boolean, default: false },
});
const emit = defineEmits(["go", "calendar"]);
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
  <WinxButton
    kind="chip"
    title="calendar"
    class="winx-is-phone-only"
    @click="emit('calendar')"
  >📅</WinxButton>
</template>
