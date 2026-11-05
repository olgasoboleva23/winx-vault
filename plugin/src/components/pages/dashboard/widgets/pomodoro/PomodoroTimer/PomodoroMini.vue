<!-- the small row: a ring, the time, the mode and stars, ▶; a click on the ring or the time opens
     the full ring -->
<script setup>
import { ICON } from "#/controllers/widgets/pomodoro.js";
import PomodoroStars from "./PomodoroStars.vue";

defineProps({ shown: { type: Object, required: true } });
defineEmits(["toggle", "play"]);
</script>

<template>
  <div class="winx-pomodoro__mini">
    <!-- eslint-disable vue/no-v-html -- the icons are our own constant SVGs (pomodoro.js ICON) -->
    <div class="winx-pomodoro__mini-ring" :style="{ '--p': shown.p }" @click="$emit('toggle')" />
    <div class="winx-pomodoro__mini-info winx-grow" @click="$emit('toggle')">
      <div class="winx-pomodoro__mini-time">{{ shown.time }}</div>
      <PomodoroStars :filled="shown.filled" :sets="shown.sets">
        <span class="winx-pomodoro__mini-mode">{{ shown.mode }}</span>
      </PomodoroStars>
    </div>
    <button
      class="winx-pomodoro__mini-play"
      @click="$emit('play')"
      v-html="shown.running ? ICON.pause : ICON.play"
    />
  </div>
</template>
