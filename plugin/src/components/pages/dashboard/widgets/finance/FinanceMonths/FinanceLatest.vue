<!-- the month's latest operations: date, category · description, sum -->
<script setup>
defineProps({ latest: { type: Array, required: true } });
</script>

<template>
  <div class="winx-fin__section">Recent transactions</div>
  <div class="winx-fin__list">
    <div v-for="r in latest" :key="r.key" class="winx-fin__item">
      <span class="winx-fin__item-date">{{ r.date }}</span>
      <span class="winx-fin__item-text">{{ r.text }}</span>
      <span class="winx-fin__item-sum">{{ r.sum }}</span>
    </div>
  </div>
</template>
