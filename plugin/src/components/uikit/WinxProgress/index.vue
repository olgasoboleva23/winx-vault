<!-- A progress bar with its count: a pill bar and "done/total" (a medication course's, a
     project's); the caller shows it only when there is something to count -->
<script setup>
defineProps({
  value: { type: Number, required: true },
  max: { type: Number, required: true },
});
</script>

<template>
  <div class="winx-progress winx-row winx-gap-m">
    <progress class="winx-progress__bar" :value="value" :max="max" />
    <span class="winx-progress__count">{{ value }}/{{ max }}</span>
  </div>
</template>
