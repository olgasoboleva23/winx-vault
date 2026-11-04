<!-- a widget whose note isn't there: "✦ Create 00 System/Data/Goals.md" -->
<script setup>
import WinxEmpty from "./WinxEmpty.vue";

defineProps({ path: { type: String, required: true } });
</script>

<template>
  <WinxEmpty :text="`Create ${path}`" />
</template>
