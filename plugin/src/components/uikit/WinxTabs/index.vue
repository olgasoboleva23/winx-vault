<!-- Tabs (block winx-tabs): a word per tab ({ key, text }), the picked one underlined in gold;
     v-model is the picked tab's key (the calendar's panel, a Form window's tabs) -->
<script setup>
defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, default: null },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <div class="winx-tabs">
    <button
      v-for="t in tabs"
      :key="t.key"
      :class="['winx-tabs__tab', { 'winx-tabs__tab--on': t.key === modelValue }]"
      :data-tab="t.key"
      @click="$emit('update:modelValue', t.key)"
    >{{ t.text }}</button>
  </div>
</template>
