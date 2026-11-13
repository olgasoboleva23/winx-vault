<!-- A drawer (block winx-drawer) over the tab's page: side left slides in from the left edge,
     bottom (--bottom) is the phone's sheet; the slot is its content, label its aria-label. Closed,
     it draws nothing; a click on the backdrop or Esc inside it says close (the parent sets open).
     Open, its panel takes focus; desktop Tab stays inside. The phone sheet leaves the bottom
     navigation reachable. Closed, focus returns unless it already moved outside the panel -->
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
  if (!open) {
    if (panel.value?.contains(document.activeElement)) back?.focus({ preventScroll: true });
    back = null;
    return;
  }

  back = document.activeElement;
  await nextTick();
  // the entering sheet is still outside its final box
  panel.value?.focus({ preventScroll: true });
}, { immediate: true });

function tab(event) {
  if (props.side === "bottom") return;
  const el = panel.value;
  const items = [...el.querySelectorAll("button, a[href], input, select, textarea, [tabindex]")]
    .filter(item => item.tabIndex >= 0 && !item.matches(":disabled") && item.isShown());
  const first = items[0] ?? el, last = items.at(-1) ?? el;
  const active = el.ownerDocument.activeElement;

  if (active === el || active === (event.shiftKey ? first : last)) {
    event.preventDefault();
    (event.shiftKey ? last : first).focus();
  }
}
</script>

<template>
  <div v-if="open" :class="['winx-drawer', `winx-drawer--${side}`]" @keydown.esc="emit('close')">
    <div class="winx-drawer__backdrop" @click="emit('close')" />
    <div
      ref="panel"
      class="winx-drawer__panel"
      role="dialog"
      :aria-modal="side === 'left' ? 'true' : null"
      tabindex="-1"
      :aria-label="label"
      @keydown.tab="tab"
    >
      <slot />
    </div>
  </div>
</template>
