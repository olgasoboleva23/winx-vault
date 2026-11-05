<!-- the dashboard's Finance card: this month's spent and income on one line, the Finance note a tap
     away -->
<script setup>
import WinxNoteLink from "#/components/uikit/WinxNoteLink.vue";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="winx-fin-month">
    <div v-if="!state.data.empty">{{ state.data.month }}: spent
      <b class="winx-fin-month__sum">{{ state.data.spent }}</b> · income
      <b class="winx-fin-month__sum">{{ state.data.income }}</b></div>
    <WinxNoteLink path="Finance" kind="text">💰 open finance</WinxNoteLink>
  </div>
</template>
