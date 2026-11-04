<!-- a screen that couldn't draw: "⚠ couldn't draw: <why>" and retry (the parent's @retry loads
     again) -->
<script setup>
import WinxEmpty from "./WinxEmpty.vue";
import WinxButton from "./WinxButton.vue";

defineProps({ text: { type: String, required: true } });
defineEmits(["retry"]);
</script>

<template>
  <WinxEmpty :text="`couldn't draw: ${text}`" mod="error" icon="⚠">
    <WinxButton kind="chip" class="winx-empty__retry" @click="$emit('retry')">retry</WinxButton>
  </WinxEmpty>
</template>
