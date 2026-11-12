<!-- A drawer (block winx-drawer) over the tab's page: side left slides in from the left edge,
     bottom (--bottom) is the phone's sheet; the slot is its content, label its aria-label. Closed,
     it draws nothing; a click on the backdrop or Esc inside it says close (the parent sets open).
     Open, its panel (a modal dialog) takes the focus; closed, the focus goes back where it was -->
<script setup>
import { nextTick, ref, watch } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  side: { type: String, default: "left" },   // left | bottom
  label: { type: String, default: null },
});
const emit = defineEmits(["close"]);

const panel = ref(null);
let back = null;   // what had the focus before the drawer opened

watch(() => props.open, async open => {
  if (!open) { back?.focus(); back = null; return; }

  back = document.activeElement;
  await nextTick();
  panel.value?.focus();
}, { immediate: true });
</script>

<template>
  <div v-if="open" :class="['winx-drawer', `winx-drawer--${side}`]" @keydown.esc="emit('close')">
    <div class="winx-drawer__backdrop" @click="emit('close')" />
    <div
      ref="panel"
      class="winx-drawer__panel"
      role="dialog"
      aria-modal="true"
      tabindex="-1"
      :aria-label="label"
    >
      <slot />
    </div>
  </div>
</template>
