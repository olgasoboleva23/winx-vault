<!-- A drawer (block winx-drawer) over the tab's page: side left slides in from the left edge,
     bottom (--bottom) is the phone's sheet; the slot is its content. Closed, it draws nothing; a
     click on the backdrop or Esc says close (the parent sets open) -->
<script setup>
import { onBeforeUnmount, onMounted } from "vue";

const props = defineProps({
  open: { type: Boolean, default: false },
  side: { type: String, default: "left" },   // left | bottom
});
const emit = defineEmits(["close"]);

const esc = e => { if (props.open && e.key === "Escape") emit("close"); };

onMounted(() => document.addEventListener("keydown", esc));
onBeforeUnmount(() => document.removeEventListener("keydown", esc));
</script>

<template>
  <div v-if="open" :class="['winx-drawer', `winx-drawer--${side}`]">
    <div class="winx-drawer__backdrop" @click="emit('close')" />
    <div class="winx-drawer__panel">
      <slot />
    </div>
  </div>
</template>
