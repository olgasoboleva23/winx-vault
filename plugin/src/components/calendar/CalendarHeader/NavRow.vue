<!-- the navigation: ‹ the shown week or month ›, today (when it isn't shown), week / month,
     ✓ done, 🔁 repeats -->
<script setup>
import { computed, inject } from "vue";
import { Platform } from "obsidian";
import WinxButton from "../../uikit/WinxButton.vue";
import { T } from "../../../calendar/data.js";
import { goTo } from "../../../calendar/state.js";
import { addDays, addMonths } from "../../../core/dates.js";

const M = d => window.moment(d);
const view = inject("calendar");
const ctx = computed(() => view.ctx);
const state = view.state;

const nav = computed(() => {
  const { view: v, days, today, base } = ctx.value;
  return {
    v, other: v === "week" ? "month" : "week",
    title: v === "week"
      ? `${M(days[0]).format("D MMM")} – ${M(days.at(-1)).format("D MMM YYYY")}`
      : M(base).format("MMMM YYYY"),
    toToday: days.includes(today) ? null : (Platform.isMobile ? "☀️" : "today"),
  };
});

// the days with 🔁 entries; the repeats button is lit while all of them are unfolded, and
// (un)folds them all
const routineDays = computed(() =>
  ctx.value.days.filter(d => ctx.value.model.byDay[d].some(e => T(e.t).isRecurring)));
const allOpen = computed(() => routineDays.value.every(d => state.unfolded.includes(d)));

const go = date => goTo(state, date, ctx.value);   // null: follow today
const step = n => {
  const { view: v, base } = ctx.value;
  go(v === "week" ? addDays(base, 7 * n) : addMonths(base, n));
};
const switchView = () => { state.view = ctx.value.view === "week" ? "month" : "week"; };
const showDone = () => { state.showDone = !state.showDone; };
const repeats = () => {
  const open = !allOpen.value, days = routineDays.value;
  state.unfolded = open
    ? [...new Set([...state.unfolded, ...days])]
    : state.unfolded.filter(d => !days.includes(d));
};
</script>

<template>
  <div class="winx-nav" data-part="header">
    <WinxButton kind="nav" title="previous" @click="step(-1)">‹</WinxButton>
    <span class="winx-nav__title">{{ nav.title }}</span>
    <WinxButton
      kind="nav"
      title="next"
      mirrored
      @click="step(1)"
    >›</WinxButton>
    <WinxButton
      v-if="nav.toToday"
      kind="chip"
      title="today"
      @click="go(null)"
    >{{ nav.toToday }}</WinxButton>
    <WinxButton
      kind="chip"
      :title="`switch to the ${nav.other} view`"
      @click="switchView"
    >{{ nav.v }}</WinxButton>
    <WinxButton kind="toggle" :on="state.showDone" @click="showDone">✓ done</WinxButton>
    <WinxButton
      kind="toggle"
      :on="allOpen"
      title="unfold / fold every day's 🔁 box"
      @click="repeats"
    >🔁 repeats</WinxButton>
  </div>
</template>
