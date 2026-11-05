<!-- spending by month: a column per month, the shown one --current -->
<script setup>
defineProps({ trend: { type: Array, required: true } });
</script>

<template>
  <div class="winx-fin__section">Spending by month</div>
  <div class="winx-fin__trend">
    <div
      v-for="b in trend"
      :key="b.month"
      :class="['winx-fin__bar', { 'winx-fin__bar--current': b.current }]"
    >
      <div class="winx-fin__col" :style="{ height: `${b.height}%` }" :aria-label="b.sum" />
      <small class="winx-fin__bar-label">{{ b.label }}</small>
    </div>
  </div>
</template>
