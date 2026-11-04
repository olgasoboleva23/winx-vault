<!-- the month on the desktop: weekday names, then a cell per day with its tasks;
     @pick(event, day): a click on a cell -->
<script setup>
import DayFill from "../DayFill.vue";
import DayZones from "../DayZones.vue";

defineProps({ weekdays: { type: Array, required: true }, cells: { type: Array, required: true } });
defineEmits(["pick"]);
</script>

<template>
  <div class="winx-cal__month" data-part="grid">
    <div v-for="w in weekdays" :key="w" class="winx-cal__weekday">{{ w }}</div>
    <div
      v-for="c in cells"
      :key="c.d"
      :class="['winx-cal__cell', {
        'winx-cal__cell--today': c.today,
        'winx-cal__cell--picked': c.picked,
        'winx-cal__cell--outside': c.outside,
      }]"
      :data-day="c.d"
      @click="$emit('pick', $event, c.d)"
    >
      <div class="winx-cal__num">{{ c.num }}</div>
      <DayFill :day="c.d" compact />
      <DayZones :day="c.d" />
    </div>
  </div>
</template>
