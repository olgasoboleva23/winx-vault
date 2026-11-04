<!-- The days: 7 columns (the week) or a month grid; on the phone the month is dots per day and the picked day
     (today, or the month's first) as a day card under it. Month: a click on a day's number or empty space opens
     its week; on the phone it picks the day shown under the grid -->
<script setup>
import { computed, inject } from "vue";
import { Platform } from "obsidian";
import CalendarDay from "./CalendarDay.vue";
import DayFill from "./DayFill.vue";
import DayZones from "./DayZones.vue";
import { dateFor } from "../../calendar/state.js";

const EMPTY = ".winx-cal__num, .winx-cal__marks, .winx-cal__marks *, .winx-cal__dots, .winx-cal__dots *";
const sameMonth = (a, b) => a.slice(0, 7) === b.slice(0, 7);
const view = inject("calendar");
const ctx = computed(() => view.ctx);
const state = view.state;
const phone = Platform.isMobile;
const layout = computed(() => ctx.value.view === "week" ? "week" : phone ? "phone" : "month");
const picked = computed(() => {
  const { days, today, base } = ctx.value, chosen = state.picked;
  return days.includes(chosen) ? chosen
    : days.includes(today) && sameMonth(today, base) ? today
    : base.slice(0, 8) + "01";
});
const weekdays = computed(() =>
  ctx.value.days.slice(0, 7).map(d => window.moment(d).format(layout.value === "phone" ? "dd" : "ddd")));
// a month's cell: today, the phone's picked day, a day of another month; on the phone a dot per task (open pink,
// done gold), 3 at most and "+N"
const cells = computed(() => {
  const { days, today, base, model, shown } = ctx.value, p = layout.value === "phone" ? picked.value : null;
  return days.map(d => {
    const es = model.byDay[d].filter(e => e.kind !== "ghost" && shown[e.kind]);
    return {
      d, num: String(+d.slice(8)),
      cls: ["winx-cal__cell", {
        "winx-cal__cell--today": d === today,
        "winx-cal__cell--picked": d === p,
        "winx-cal__cell--outside": !sameMonth(d, base),
      }],
      dots: es.slice(0, 3).map((e, i) => ({ i, cls: `winx-cal__dot winx-cal__dot--${e.kind}` })),
      more: es.length > 3 ? `+${es.length - 3}` : null,
    };
  });
});
function pick(e, d) {
  if (!(e.target === e.currentTarget || e.target.matches(EMPTY))) return;
  if (phone) { state.picked = d; return; }
  Object.assign(state, { date: dateFor(d, "week", ctx.value.today), view: "week" });
}
</script>

<template>
  <div v-if="layout === 'week'" class="winx-cal__week" data-part="grid">
    <CalendarDay
      v-for="d in ctx.days"
      :key="d"
      :day="d"
      format="ddd D"
    />
  </div>
  <div v-else-if="layout === 'month'" class="winx-cal__month" data-part="grid">
    <div v-for="w in weekdays" :key="w" class="winx-cal__weekday">{{ w }}</div>
    <div
      v-for="c in cells"
      :key="c.d"
      :class="c.cls"
      :data-day="c.d"
      @click="pick($event, c.d)"
    >
      <div class="winx-cal__num">{{ c.num }}</div>
      <DayFill :day="c.d" compact />
      <DayZones :day="c.d" />
    </div>
  </div>
  <div v-else class="winx-cal__phone-month" data-part="grid">
    <div class="winx-cal__month">
      <div v-for="w in weekdays" :key="w" class="winx-cal__weekday">{{ w }}</div>
      <div
        v-for="c in cells"
        :key="c.d"
        :class="c.cls"
        :data-day="c.d"
        @click="pick($event, c.d)"
      >
        <div class="winx-cal__num">{{ c.num }}</div>
        <div class="winx-cal__dots">
          <i v-for="dot in c.dots" :key="dot.i" :class="dot.cls" />
          <span v-if="c.more" class="winx-cal__dots-more">{{ c.more }}</span>
        </div>
        <DayZones :day="c.d" />
      </div>
    </div>
    <CalendarDay :day="picked" format="dddd D MMMM" />
  </div>
</template>
