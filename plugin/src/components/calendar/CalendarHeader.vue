<!-- The calendar's top: the drop bar (while dragging), the busy pill, date / sounds / ＋ task / ✦ to the dashboard
     (the phone), the navigation, the week's balance by area -->
<script setup>
import { computed, inject, ref } from "vue";
import { Platform } from "obsidian";
import WinxButton from "../uikit/WinxButton.vue";
import { T } from "../../calendar/data.js";
import { dateFor } from "../../calendar/state.js";
import { addDays, addMonths } from "../../core/dates.js";
import { isMuted, toggleMute } from "../../core/sounds.js";
import { app } from "../../core/app.js";

const M = d => window.moment(d);
const view = inject("calendar");
const ctx = computed(() => view.ctx);
const state = view.state;
const muted = ref(isMuted());

const go = date => { state.date = dateFor(date, ctx.value.view, ctx.value.today); };   // null: follow today
const step = n => {
  const { view: v, base } = ctx.value;
  go(v === "week" ? addDays(base, 7 * n) : addMonths(base, n));
};
const onDate = e => go(e.target.value || null);   // emptied (the phone's "Reset"): today
const mute = () => { toggleMute(); muted.value = isMuted(); };
const newTask = () => app.commands.executeCommandById("winx:new-task");
const dashboard = () => app.commands.executeCommandById("winx:open-dashboard");
const switchView = () => { state.view = ctx.value.view === "week" ? "month" : "week"; };
const showDone = () => { state.showDone = !state.showDone; };
// a piece of the balance bar: only that area's tasks; again: all
const pickArea = a => { const tag = `#area/${a}`; state.area = tag === state.area ? null : tag; };

// the days with 🔁 entries; the repeats button is lit while all of them are unfolded, and (un)folds them all
const routineDays = computed(() =>
  ctx.value.days.filter(d => ctx.value.model.byDay[d].some(e => T(e.t).isRecurring)));
const allOpen = computed(() => routineDays.value.every(d => state.unfolded.includes(d)));
const repeats = () => {
  const open = !allOpen.value, days = routineDays.value;
  state.unfolded = open ? [...new Set([...state.unfolded, ...days])] : state.unfolded.filter(d => !days.includes(d));
};

// while dragging, a bar of 7 days sticks to the top: the shown week, or in the month view the next 7 days
const chips = computed(() => {
  const { view: v, days, today } = ctx.value;
  const list = v === "week" ? days : Array.from({ length: 7 }, (_, i) => addDays(today, i));
  return list.map(d => ({
    d, label: M(d).format("ddd D"), cls: ["winx-cal__chip", { "winx-cal__chip--today": d === today }],
  }));
});
const top = computed(() => {
  const { view: v, days, today, base } = ctx.value, other = v === "week" ? "month" : "week";
  return {
    base, v, other,
    title: v === "week"
      ? `${M(days[0]).format("D MMM")} – ${M(days.at(-1)).format("D MMM YYYY")}`
      : M(base).format("MMMM YYYY"),
    toToday: days.includes(today) ? null : (Platform.isMobile ? "☀️" : "today"),
  };
});
// one bar of the week's tasks split by area (the six of the areas list), each piece labelled with its icon and
// done / all, the done part brighter; an area with none this week a grey icon after it
const balance = computed(() => {
  const { config: { areas }, everything, model } = ctx.value, picked = state.area;
  const b = (everything ?? model).balance(areas.map(a => a.tag));
  const name = tag => areas.find(a => a.tag === tag).label;
  const icon = tag => name(tag).split(" ")[0];
  return {
    bar: ["winx-cal__balance-bar", { "winx-cal__balance-bar--picked": !!picked }],
    pieces: b.filter(x => x.planned).map(x => ({
      cls: ["winx-cal__area", { "winx-cal__area--on": x.area === picked }], area: x.area.slice(6),
      style: `flex: ${x.planned}`, icon: icon(x.area),
      title: `${name(x.area)}: ${x.done} of ${x.planned} done`, count: `${x.done}/${x.planned}`,
      fill: `width: ${Math.round(x.done / x.planned * 100)}%`,
    })),
    none: b.filter(x => !x.planned).map(x => ({ icon: icon(x.area), title: `${name(x.area)}: nothing this week` })),
  };
});
</script>

<template>
  <div class="winx-cal__dropbar" data-part="header">
    <div class="winx-cal__dropbar-in">
      <div
        v-for="c in chips"
        :key="c.d"
        :class="c.cls"
        :data-drop="c.d"
      >{{ c.label }}</div>
    </div>
  </div>
  <div class="winx-busy" data-part="header">
    <div class="winx-busy__pill" title="saving…"><span class="winx-busy__star">✦</span></div>
  </div>
  <div class="winx-cal__top" data-part="header">
    <div class="mb-input-type-date"><input type="date" :value="top.base" @change="onDate"></div>
    <button
      class="winx-cal__mute"
      title="sounds on/off"
      aria-label="sounds on/off"
      @click="mute"
    >{{ muted ? "🔇" : "🔊" }}</button>
    <WinxButton kind="chip" title="new task (Winx: New task)" @click="newTask">＋ task</WinxButton>
    <WinxButton
      kind="chip"
      title="dashboard"
      cls="winx-cal__to-dash winx-is-phone-only"
      @click="dashboard"
    >✦</WinxButton>
  </div>
  <div class="winx-nav" data-part="header">
    <WinxButton kind="nav" title="previous" @click="step(-1)">‹</WinxButton>
    <span class="winx-nav__title">{{ top.title }}</span>
    <WinxButton
      kind="nav"
      title="next"
      mirrored
      @click="step(1)"
    >›</WinxButton>
    <WinxButton
      v-if="top.toToday"
      kind="chip"
      title="today"
      @click="go(null)"
    >{{ top.toToday }}</WinxButton>
    <WinxButton kind="chip" :title="`switch to the ${top.other} view`" @click="switchView">{{ top.v }}</WinxButton>
    <WinxButton kind="toggle" :on="state.showDone" @click="showDone">✓ done</WinxButton>
    <WinxButton
      kind="toggle"
      :on="allOpen"
      title="unfold / fold every day's 🔁 box"
      @click="repeats"
    >🔁 repeats</WinxButton>
  </div>
  <div v-if="top.v === 'week'" class="winx-cal__balance" data-part="header">
    <div :class="balance.bar">
      <div
        v-for="p in balance.pieces"
        :key="p.area"
        :class="p.cls"
        :data-area="p.area"
        :style="p.style"
        :title="p.title"
        @click="pickArea(p.area)"
      >
        <span class="winx-cal__area-label">{{ p.icon }} {{ p.count }}</span>
        <b class="winx-cal__area-track"><i class="winx-cal__area-fill" :style="p.fill" /></b>
      </div>
    </div>
    <div v-if="balance.none.length" class="winx-cal__balance-none" title="nothing this week">
      <span v-for="x in balance.none" :key="x.title" :title="x.title">{{ x.icon }}</span>
    </div>
  </div>
</template>
