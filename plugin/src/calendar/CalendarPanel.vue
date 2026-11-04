<!-- The bottom panel: No date | Ahead | Regulars | Pool, one card per area (Ahead: per month); a drop here takes
     the date off. Only it shows the tab and the backlog's cut, so switching them redraws only it -->
<script setup>
import { computed, inject, reactive, watch } from "vue";
import WinxButton from "../vue/WinxButton.vue";
import WinxEmpty from "../vue/WinxEmpty.vue";
import TaskCard from "./TaskCard.vue";
import { T } from "./data.js";
import { diffDays, dm } from "../core/dates.js";
import { ruleText } from "../tasks/repeats.js";

const SHOWN = 8;
const EMPTY_POOL = "New task with «To pool» adds one here";
const RESUME = "resume: from today, on the first day its rule allows";
const M = d => window.moment(d);
const view = inject("calendar");
const ctx = computed(() => view.ctx);
const state = view.state;
const flipped = reactive(new Set());   // regulars paused / resumed at once, until the new data comes
watch(ctx, () => flipped.clear());

// a group card's title, as on the Life Areas chart
const areaTitle = g => {
  const { areaIcons, areaMap } = ctx.value.config;
  const name = areaMap[g] ?? (g ? g.slice(6) : "other");
  return `${areaIcons[g] ?? "✦"} ${name[0].toUpperCase()}${name.slice(1)}`;
};
// `items` as group cards, one per run of the same area: { title, cards }
const byArea = (items, card) => {
  const runs = [];
  for (const t of items) {
    const a = T(t).area;
    if (!runs.length || runs.at(-1).a !== a) runs.push({ a, items: [] });
    runs.at(-1).items.push(t);
  }
  return runs.map((r, i) => ({ key: `${i}|${r.a}`, title: areaTitle(r.a), cards: r.items.map(card) }));
};
const info = t => view.info(t);

const tabs = computed(() => {
  const { backlog, regulars, pool, ahead } = ctx.value.model;
  return [
    ["nodate", `No date · ${backlog.length}`],
    ["ahead", `Ahead · ${ahead.flatMap(g => g.items).length}`],
    ["regulars", `Regulars · ${regulars.length}`],
    ["pool", `Pool · ${pool.length}`],
  ].map(([key, text]) => ({ key, text, cls: ["winx-cal__tab", { "winx-cal__tab--on": key === state.tab }] }));
});
// No date: longest-waiting first (➕ created); 8 of them until "show all"
const noDate = computed(() => {
  const { model } = ctx.value, { backlog } = model, cut = backlog.length > SHOWN && !state.backlogOpen;
  return {
    groups: byArea(cut ? backlog.slice(0, SHOWN) : backlog, t => ({ task: info(t), meta: model.backlogMeta(t) })),
    more: backlog.length > SHOWN ? (cut ? `show all ${backlog.length}` : "show less") : null,
  };
});
// Ahead: after this week, a card per month, the tasks under their dates (a date heading over each day's first)
const ahead = computed(() => {
  const { model, today } = ctx.value;
  return model.ahead.map(({ month, items }) => {
    const title = M(month + "-01").format(month.startsWith(today.slice(0, 4)) ? "MMMM" : "MMMM YYYY");
    return {
      key: month, title: `${title} · ${items.length}`,
      cards: items.map((t, i) => ({
        task: info(t),
        date: i && T(items[i - 1]).date === T(t).date ? null : `📅 ${M(T(t).date).format("D MMM · ddd")}`,
        meta: `${T(t).isBirthday ? "🎂 Birthday" : areaTitle(T(t).area)} · in ${diffDays(T(t).date, today)} d`,
      })),
    };
  });
});
// Pool: by area, the longest since last done first (never done at the top)
const pool = computed(() => byArea(ctx.value.model.pool, t => ({ task: info(t), meta: ctx.value.model.poolMeta(t) })));
// Regulars: by area, the most neglected first; paused last
const regulars = computed(() => byArea(ctx.value.model.regulars, t => {
  const next = T(t).date, task = info(t), flip = flipped.has(task.key);
  return {
    task, flip, paused: flip ? !T(t).isPaused : !next,
    rule: `${ruleText(T(t).rule)}  ·  `, history: `  ·  ${ctx.value.model.regularHistory(t)}`,
    when: next ? `next ${dm(next)}` : "⏸ paused",
    whenCls: next && next < ctx.value.today ? { class: "winx-cal__late" } : {},   // late: in red
    button: next ? { icon: "⏸", title: "pause: drop its dates" } : { icon: "▶", title: RESUME },
  };
}));

const setTab = key => { state.tab = key; };
const more = () => { state.backlogOpen = !state.backlogOpen; };
const toToday = c => { const t = view.task(c.task.key); if (t) view.actions.fromPool(t, ctx.value.today, false); };
// at once; the new data follows the write
const pause = c => {
  const t = view.task(c.task.key);
  if (!t) return;
  flipped.add(c.task.key);
  view.actions.pauseOrResume(t);
};
</script>

<template>
  <div class="winx-cal__backlog winx-board-backlog" data-drop="" data-part="panel">
    <div class="winx-cal__tabs">
      <button
        v-for="t in tabs"
        :key="t.key"
        :class="t.cls"
        :data-tab="t.key"
        @click="setTab(t.key)"
      >{{ t.text }}</button>
    </div>
    <div class="winx-cal__backlog-grid">
      <template v-if="state.tab === 'nodate'">
        <div v-for="g in noDate.groups" :key="g.key" class="winx-cal__group-card">
          <div class="winx-cal__group">{{ g.title }}</div>
          <TaskCard
            v-for="c in g.cards"
            :key="c.task.key"
            :task="c.task"
            :meta="c.meta"
          />
        </div>
      </template>
      <template v-else-if="state.tab === 'ahead'">
        <WinxEmpty v-if="!ahead.length" />
        <div v-for="g in ahead" :key="g.key" class="winx-cal__group-card">
          <div class="winx-cal__group">{{ g.title }}</div>
          <template v-for="c in g.cards" :key="c.task.key">
            <div v-if="c.date" class="winx-cal__date">{{ c.date }}</div>
            <TaskCard :task="c.task" :meta="c.meta" />
          </template>
        </div>
      </template>
      <template v-else-if="state.tab === 'pool'">
        <WinxEmpty v-if="!pool.length" :text="EMPTY_POOL" />
        <div v-for="g in pool" :key="g.key" class="winx-cal__group-card">
          <div class="winx-cal__group">{{ g.title }}</div>
          <TaskCard
            v-for="c in g.cards"
            :key="c.task.key"
            :task="c.task"
            :meta="c.meta"
          >
            <template #extra><WinxButton title="add to today" @click="toToday(c)">+📅</WinxButton></template>
          </TaskCard>
        </div>
      </template>
      <template v-else>
        <div v-for="g in regulars" :key="g.key" class="winx-cal__group-card">
          <div class="winx-cal__group">{{ g.title }}</div>
          <TaskCard
            v-for="c in g.cards"
            :key="c.task.key"
            :task="c.task"
            :cls="c.paused ? 'winx-task-card--paused' : null"
          >
            <template #meta>{{ c.rule }}<span v-bind="c.whenCls">{{ c.when }}</span>{{ c.history }}</template>
            <template #extra>
              <WinxButton :title="c.button.title" :disabled="c.flip" @click="pause(c)">{{ c.button.icon }}</WinxButton>
            </template>
          </TaskCard>
        </div>
      </template>
    </div>
    <button v-if="state.tab === 'nodate' && noDate.more" class="winx-cal__more" @click="more">{{ noDate.more }}</button>
  </div>
</template>
