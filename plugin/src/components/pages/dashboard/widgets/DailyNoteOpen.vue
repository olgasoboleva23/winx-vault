<!-- "✦ Open": the day's note (made if it's missing) -->
<script setup>
import WinxButton from "../../../uikit/WinxButton/index.vue";

defineProps({ state: { type: Object, required: true }, actions: { type: Object, required: true } });
</script>

<template>
  <WinxButton
    v-if="state.data.date"
    kind="pill"
    title="open the day's note"
    @click="actions.open()"
  >
    {{ state.data.text }}
  </WinxButton>
</template>
