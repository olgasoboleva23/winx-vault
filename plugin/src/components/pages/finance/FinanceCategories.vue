<!-- the month's categories, each a bar against its budget (over it: --over) or against the biggest
-->
<script setup>
defineProps({ categories: { type: Array, required: true } });
</script>

<template>
  <div class="winx-fin__section">Categories</div>
  <div class="winx-fin__rows winx-col winx-gap-s">
    <div v-for="c in categories" :key="c.name" class="winx-fin__row">
      <span>{{ c.name }}</span>
      <span :class="['winx-fin__amt', { 'winx-fin__amt--over': c.over }]">{{ c.amount }}</span>
      <div class="winx-fin__track">
        <div class="winx-fin__fill" :style="{ width: `${c.width}%`, background: c.fill }" />
      </div>
    </div>
  </div>
</template>
