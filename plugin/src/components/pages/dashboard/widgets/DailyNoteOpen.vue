<!-- "✦ Open": the day's note (made if it's missing) -->
<script setup>
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import { openDaily } from "#/controllers/widgets/dailyNote.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <WinxButton
    v-if="state.data.date"
    kind="pill"
    title="open the day's note"
    @click="openDaily(state.data.date)"
  >
    {{ state.data.text }}
  </WinxButton>
</template>
