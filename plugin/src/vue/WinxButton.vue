<!-- A button (block winx-btn), as uikit/button.js: its look is its kind (round, nav, pill, chip, toggle, text;
     one block of styles each in styles/uikit/_buttons.scss); on: winx-btn--on; title: also its aria-label;
     cls: a place's own classes. Its text is the slot; a click is the parent's @click -->
<script setup>
defineProps({
  kind: { type: String, default: "round" },
  on: { type: Boolean, default: false },
  title: { type: String, default: null },
  cls: { type: String, default: null },
});
</script>

<template>
  <button :class="['winx-btn', `winx-btn--${kind}`, { 'winx-btn--on': on }, cls]" :title="title" :aria-label="title">
    <slot />
  </button>
</template>
