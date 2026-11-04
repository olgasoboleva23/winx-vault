<!-- the top row: the date field, sounds on/off, ＋ task, ✦ to the dashboard (the phone) -->
<script setup>
import { computed, inject, ref } from "vue";
import WinxButton from "../../uikit/WinxButton.vue";
import { goTo } from "../../../calendar/state.js";
import { isMuted, toggleMute } from "../../../core/sounds.js";
import { app } from "../../../core/app.js";

const view = inject("calendar");
const base = computed(() => view.ctx.base);
const muted = ref(isMuted());

// emptied (the phone's "Reset"): today
const onDate = e => goTo(view.state, e.target.value || null, view.ctx);
const mute = () => { toggleMute(); muted.value = isMuted(); };
const newTask = () => app.commands.executeCommandById("winx:new-task");
const dashboard = () => app.commands.executeCommandById("winx:open-dashboard");
</script>

<template>
  <div class="winx-cal__top" data-part="header">
    <div class="mb-input-type-date"><input type="date" :value="base" @change="onDate"></div>
    <button
      class="winx-cal__mute"
      title="sounds on/off"
      aria-label="sounds on/off"
      @click="mute"
    >{{ muted ? "🔇" : "🔊" }}</button>
    <WinxButton kind="chip" title="new task (Winx: New task)" @click="newTask">＋ task</WinxButton>
    <WinxButton
      kind="chip"
      title="dashboard"
      cls="winx-cal__to-dash winx-is-phone-only"
      @click="dashboard"
    >✦</WinxButton>
  </div>
</template>
