<!-- Ahead: after this week, a card per month, the tasks under their dates (a date heading over
     each day's first) -->
<script setup>
import { computed, inject } from "vue";
import WinxEmpty from "../../uikit/WinxEmpty.vue";
import GroupCard from "./GroupCard.vue";
import TaskCard from "../TaskCard.vue";
import { T } from "../../../calendar/data.js";
import { diffDays } from "../../../core/dates.js";
import { areaTitle } from "./groups.js";

const M = d => window.moment(d);
const view = inject("calendar");

const months = computed(() => {
  const { model, today, config } = view.ctx;
  return model.ahead.map(({ month, items }) => {
    const year = month.startsWith(today.slice(0, 4)) ? "MMMM" : "MMMM YYYY";
    const title = M(month + "-01").format(year);
    return {
      key: month, title: `${title} · ${items.length}`,
      cards: items.map((t, i) => ({
        task: view.info(t),
        date: i && T(items[i - 1]).date === T(t).date
          ? null
          : `📅 ${M(T(t).date).format("D MMM · ddd")}`,
        meta: `${T(t).isBirthday ? "🎂 Birthday" : areaTitle(config, T(t).area)}`
          + ` · in ${diffDays(T(t).date, today)} d`,
      })),
    };
  });
});
</script>

<template>
  <WinxEmpty v-if="!months.length" />
  <GroupCard v-for="g in months" :key="g.key" :title="g.title">
    <template v-for="c in g.cards" :key="c.task.key">
      <div v-if="c.date" class="winx-cal__date">{{ c.date }}</div>
      <TaskCard :task="c.task" :meta="c.meta" />
    </template>
  </GroupCard>
</template>
