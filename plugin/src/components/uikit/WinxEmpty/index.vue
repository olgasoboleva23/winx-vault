<!-- an empty list's line with a sparkle: "✦ All bought"; no text: "✦ Nothing here yet" (as
     uikit/empty.js); mod: a modifier (winx-empty--error), icon instead of ✦; the slot goes
     after the text (a button) -->
<script setup>
defineProps({
  text: { type: String, default: "Nothing here yet" },
  mod: { type: String, default: null },
  icon: { type: String, default: "✦" },
});
</script>

<template>
  <div
    class="winx-empty winx-text-center"
    :class="mod && `winx-empty--${mod}`"
  >{{ icon }} {{ text }}<slot /></div>
</template>
