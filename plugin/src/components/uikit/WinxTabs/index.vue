<!-- Tabs (block winx-tabs): a word per tab ({ key, text }), the picked one underlined in gold;
     v-model is the picked tab's key (the calendar's panel, a Form window's tabs); photo: the light
     look, for tabs straight on the background photo (the projects' list) -->
<script setup>
defineProps({
  tabs: { type: Array, required: true },
  modelValue: { type: String, default: null },
  photo: { type: Boolean, default: false },
});
defineEmits(["update:modelValue"]);
</script>

<template>
  <div :class="['winx-tabs', { 'winx-tabs--photo': photo }]">
    <button
      v-for="t in tabs"
      :key="t.key"
      :class="['winx-tabs__tab', { 'winx-tabs__tab--on': t.key === modelValue }]"
      :data-tab="t.key"
      @click="$emit('update:modelValue', t.key)"
    >{{ t.text }}</button>
  </div>
</template>
