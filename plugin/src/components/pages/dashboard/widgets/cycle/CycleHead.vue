<!-- the head: the day (in the period: highlighted; its MP in the tooltip, v-tip), its phase,
     the next start; a click folds or unfolds (@fold) -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";

defineProps({ head: { type: Object, required: true }, open: { type: Boolean, required: true } });
defineEmits(["fold"]);
</script>

<template>
  <div
    v-tip:bottom="open ? 'fold' : 'show the cycles'"
    class="winx-cycle__head"
    @click="$emit('fold')"
  >
    <div
      v-tip="head.title"
      :class="['winx-cycle__day', { 'winx-cycle__day--period': head.period }]"
    >day {{ head.day }}<span class="winx-cycle__phase"> · {{ head.phase }}</span></div>
    <div class="winx-cycle__next">next ~{{ head.next }}, {{ head.when }}</div>
  </div>
</template>
