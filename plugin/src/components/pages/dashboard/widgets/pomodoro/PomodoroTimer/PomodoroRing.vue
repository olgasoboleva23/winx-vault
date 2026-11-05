<!-- the full ring: ↺ ▶ ⏭ around the time (a click on it folds back to the small row), the mode and
     session, the stars, the lengths and ⚙ -->
<script setup>
import { ICON } from "../../../../../../controllers/pomodoro.js";
import PomodoroStars from "./PomodoroStars.vue";

defineProps({ shown: { type: Object, required: true } });
defineEmits(["toggle", "play", "reset", "skip", "gear"]);
</script>

<template>
  <div class="winx-pomodoro__body">
    <!-- eslint-disable vue/no-v-html -- the icons are our own constant SVGs (pomodoro.js ICON) -->
    <div class="winx-pomodoro__ring" :style="{ '--p': shown.p }">
      <div class="winx-pomodoro__wing winx-pomodoro__wing--left" />
      <div class="winx-pomodoro__wing winx-pomodoro__wing--right" />
      <div class="winx-pomodoro__top-star" v-html="ICON.star" />
      <div class="winx-pomodoro__time" @click="$emit('toggle')">{{ shown.time }}</div>
      <div class="winx-pomodoro__controls">
        <button
          class="winx-pomodoro__btn winx-pomodoro__btn--reset"
          @click="$emit('reset')"
          v-html="ICON.reset"
        />
        <button
          class="winx-pomodoro__btn winx-pomodoro__btn--play"
          @click="$emit('play')"
          v-html="shown.running ? ICON.pause : ICON.play"
        />
        <button
          class="winx-pomodoro__btn winx-pomodoro__btn--skip"
          @click="$emit('skip')"
          v-html="ICON.skip"
        />
      </div>
    </div>
    <div class="winx-pomodoro__mode">
      <span class="winx-pomodoro__mode-text">{{ shown.mode }}</span>
      <span class="winx-pomodoro__session">{{ shown.session }}</span>
    </div>
    <PomodoroStars :filled="shown.filled" :sets="shown.sets" />
    <div class="winx-pomodoro__bottom">
      <span class="winx-pomodoro__settings-info">{{ shown.lengths }}</span>
      <button class="winx-pomodoro__gear" @click="$emit('gear')" v-html="ICON.gear" />
    </div>
  </div>
</template>
