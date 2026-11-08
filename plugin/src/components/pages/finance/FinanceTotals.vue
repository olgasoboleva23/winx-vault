<!-- the month's spent, received and net -->
<script setup>
defineProps({ totals: { type: Array, required: true } });
</script>

<template>
  <div class="winx-fin__totals winx-flex winx-gap-l">
    <div
      v-for="t in totals"
      :key="t.label"
      class="winx-fin__total winx-grow winx-text-center"
      :class="`winx-fin__total--${t.sign}`"
    >
      <span class="winx-fin__total-label">{{ t.label }}</span>
      <b class="winx-fin__total-value">{{ t.value }}</b>
    </div>
  </div>
</template>
