<!-- An empty message, with an optional action in the slot.
     onBackground uses WinxCard to keep it readable directly on the page background. -->
<script setup>
import WinxCard from "#/components/uikit/WinxCard/index.vue";

defineProps({
  onBackground: { type: Boolean, default: false },
  text: { type: String, default: "Nothing here yet" },
  mod: { type: String, default: null },
  icon: { type: String, default: "✦" },
});
</script>

<template>
  <component
    :is="onBackground ? WinxCard : 'div'"
    :meta="onBackground ? ['hero'] : undefined"
    class="winx-empty winx-text-center"
    :class="mod && `winx-empty--${mod}`"
  >{{ icon }} {{ text }}<slot /></component>
</template>
