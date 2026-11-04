<!-- A button (block winx-btn): its look is its kind (round, nav, pill, chip, toggle, text; one
     block of styles each in styles/uikit/_buttons.scss); on: winx-btn--on; mirrored: the nav
     chevron for "next"; title: also its aria-label. A place's own classes: class="…" on it (Vue
     adds them after these). Its text is the slot; a click is the parent's @click -->
<script setup>
defineProps({
  kind: { type: String, default: "round" },
  on: { type: Boolean, default: false },
  mirrored: { type: Boolean, default: false },   // the nav chevron the other way: "next"
  title: { type: String, default: null },
});
</script>

<template>
  <button
    :class="[
      'winx-btn',
      `winx-btn--${kind}`,
      { 'winx-btn--on': on, 'winx-btn--mirrored': mirrored },
    ]"
    :title="title"
    :aria-label="title"
  >
    <slot />
  </button>
</template>
