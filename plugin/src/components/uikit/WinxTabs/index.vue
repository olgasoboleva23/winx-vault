<!-- Tabs (block winx-tabs): a word per tab ({ key, text }), the picked one underlined in gold;
     v-model is the picked tab's key; onBackground: light text on the page background;
     scroll: one row, scrolls sideways when the tabs do not fit (the courses) -->
<script setup>
defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, default: null },
  onBackground: { type: Boolean, default: false },
  scroll: { type: Boolean, default: false },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <div
    class="winx-tabs"
    :class="{ 'winx-tabs--on-background': onBackground, 'winx-tabs--scroll': scroll }"
  >
    <button
      v-for="t in tabs"
      :key="t.key"
      :class="['winx-tabs__tab', { 'winx-tabs__tab--on': t.key === modelValue }]"
      :data-tab="t.key"
      @click="$emit('update:modelValue', t.key)"
    >{{ t.text }}</button>
  </div>
</template>
