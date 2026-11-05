<!-- the four stars of the sessions done (a full set: ×N); the slot goes first (the small row's
     mode) -->
<script setup>
import { ICON } from "../../../../../../controllers/pomodoro.js";

defineProps({ filled: { type: Number, required: true }, sets: { type: String, required: true } });
</script>

<template>
  <div class="winx-pomodoro__stars">
    <!-- eslint-disable vue/no-v-html -- the icons are our own constant SVGs (pomodoro.js ICON) -->
    <slot />
    <div
      v-for="i in 4"
      :key="i"
      :class="['winx-pomodoro__star', { 'winx-pomodoro__star--on': i <= filled }]"
      v-html="ICON.star"
    />
    <span class="winx-pomodoro__multiplier">{{ sets }}</span>
  </div>
</template>
