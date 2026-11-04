<!-- the head: the day (in the period: highlighted; its MP in the tooltip), its phase, the next
     start; a click folds or unfolds (@fold) -->
<script setup>
defineProps({ head: { type: Object, required: true }, open: { type: Boolean, required: true } });
defineEmits(["fold"]);
</script>

<template>
  <div class="winx-cycle__head" :title="open ? 'fold' : 'show the cycles'" @click="$emit('fold')">
    <div
      :class="['winx-cycle__day', { 'winx-cycle__day--period': head.period }]"
      :title="head.title"
    >day {{ head.day }}<span class="winx-cycle__phase"> · {{ head.phase }}</span></div>
    <div class="winx-cycle__next">next ~{{ head.next }}, {{ head.when }}</div>
  </div>
</template>
