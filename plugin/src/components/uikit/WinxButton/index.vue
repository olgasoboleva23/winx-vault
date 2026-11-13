<!-- A button (block winx-btn): its look is its kind (round, nav, pill, chip, toggle, text, add,
     rail; one block of styles each in index.scss next to it); on: winx-btn--on; jump: it grows on
     hover (an add one); mirrored: the nav
     chevron for "next"; title: its tooltip (v-tip; tip: pink on a blue place) and aria-label.
     A place's own classes: class="…" on it (Vue adds them after these). Its text is the slot; a
     click is the parent's @click -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";

defineProps({
  kind: { type: String, default: "round" },
  on: { type: Boolean, default: false },
  mirrored: { type: Boolean, default: false },   // the nav chevron the other way: "next"
  jump: { type: Boolean, default: false },
  title: { type: String, default: null },
  tip: { type: String, default: "blue" },   // the tooltip's colour: blue | pink (on a blue place)
});
</script>

<template>
  <button
    v-tip="{ text: title, pink: tip === 'pink' }"
    :class="[
      'winx-btn',
      `winx-btn--${kind}`,
      { 'winx-btn--on': on, 'winx-btn--mirrored': mirrored, 'winx-btn--jump': jump },
    ]"
    :aria-label="title"
  >
    <slot />
  </button>
</template>
