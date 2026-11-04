<!-- a dashboard card: the markup Obsidian draws for a "> [!card] Title" callout (as uikit/card.js), with a slot -->
<script setup>
defineProps({ title: { type: String, default: "" }, meta: { type: Array, default: () => [] } });
</script>

<template>
  <div
    class="callout winx-widget"
    data-callout="card"
    :data-callout-metadata="meta.join(' ')"
    data-callout-fold=""
  >
    <div class="callout-title winx-widget__title" dir="auto">
      <div class="callout-icon" />
      <div class="callout-title-inner">{{ title }}</div>
    </div>
    <div class="callout-content winx-widget__body"><slot /></div>
  </div>
</template>
