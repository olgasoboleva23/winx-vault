<!-- the week: 7 day columns -->
<script setup>
import CalendarDay from "#/components/pages/calendar/CalendarDay.vue";

defineProps({ days: { type: Array, required: true } });
</script>

<template>
  <div class="winx-cal__week" data-part="grid">
    <CalendarDay
      v-for="d in days"
      :key="d"
      :day="d"
      format="ddd D"
    />
  </div>
</template>
