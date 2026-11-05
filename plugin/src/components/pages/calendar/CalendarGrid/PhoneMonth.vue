<!-- the month on the phone: a cell per day with a dot per task, and the picked day as a day card
     under it; @pick(event, day): a click on a cell -->
<script setup>
import CalendarDay from "../CalendarDay.vue";
import DayZones from "../DayZones.vue";

defineProps({
  weekdays: { type: Array, required: true },
  cells: { type: Array, required: true },
  picked: { type: String, required: true },
});
defineEmits(["pick"]);
</script>

<template>
  <div class="winx-cal__phone-month" data-part="grid">
    <div class="winx-cal__month">
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
        <div class="winx-cal__dots">
          <i
            v-for="dot in c.dots"
            :key="dot.i"
            :class="['winx-cal__dot', `winx-cal__dot--${dot.kind}`]"
          />
          <span v-if="c.more" class="winx-cal__dots-more">{{ c.more }}</span>
        </div>
        <DayZones :day="c.d" />
      </div>
    </div>
    <CalendarDay :day="picked" format="dddd D MMMM" />
  </div>
</template>
