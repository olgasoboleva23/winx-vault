<!-- a day's tasks: its rows, its 🔁 entries folded into one "🔁 2/5" box (unfolded: by time of
     day), the done ones ✓ done hides as ✓N. A click on the box's edge, its pill or a group
     heading folds / unfolds the day (saved) -->
<script setup>
import { computed, inject } from "vue";
import TaskRow from "./TaskRow.vue";
import DoneMarks from "./DoneMarks.vue";
import { T } from "../../calendar/data.js";

const TIMES = [["morning", "🌅 morning"], ["evening", "🌙 evening"], [null, "🔁 other"]];
const EDGE = [
  ".winx-cal__routine", ".winx-cal__routine-pill", ".winx-cal__routine-pill *",
  ".winx-cal__routine-time",
].join(", ");
const props = defineProps({
  day: { type: String, required: true },
  compact: { type: Boolean, default: false },
});
const view = inject("calendar");
const ctx = computed(() => view.ctx);
const state = view.state;
const row = e => ({
  key: `${view.info(e.t).key}|${e.kind}`, task: view.info(e.t), kind: e.kind, after: !!e.follows,
});
// the 🔁 box's groups by time of day: { name, rows }; a task after another goes in its group
const groups = es => {
  const time = e => T((e.follows ?? e).t).time;
  const inGroup = tag => e => time(e) === tag || (!tag && !TIMES.some(([g]) => g && time(e) === g));

  return TIMES.map(([tag, name]) => ({ name, rows: es.filter(inGroup(tag)).map(row) }))
    .filter(g => g.rows.length);
};

const fill = computed(() => {
  const { rows, routine, routineRows, hidden, routineHidden } =
    ctx.value.model.dayParts(props.day, ctx.value.shown);

  return {
    rows: rows.map(row), routine: routine.length ? {
      count: `🔁 ${routine.filter(e => e.kind === "done").length}/${routine.length}`,
      title: routine.map(e => view.info(e.t).label).join("\n"),
      groups: groups(routineRows), hidden: routineHidden,
    } : null,
    hidden,
  };
});
const open = computed(() => state.unfolded.includes(props.day));
const tick = computed(() => !!ctx.value.TASKS);

function fold(e) {
  if (!e.target.matches(EDGE)) return;
  const d = props.day;
  state.unfolded = open.value ? state.unfolded.filter(x => x !== d) : [...state.unfolded, d];
}
</script>

<template>
  <TaskRow
    v-for="r in fill.rows"
    :key="r.key"
    :task="r.task"
    :kind="r.kind"
    :compact="compact"
    :tick="tick"
    :after="r.after"
  />
  <div
    v-if="fill.routine"
    :class="['winx-cal__routine', { 'winx-cal__routine--open': open }]"
    :data-day="day"
    @click="fold"
  >
    <div v-show="!open" class="winx-cal__routine-pill" :title="fill.routine.title">
      <span>{{ fill.routine.count }}</span>
    </div>
    <div v-show="open" class="winx-cal__routine-list">
      <template v-for="g in fill.routine.groups" :key="g.name">
        <div class="winx-cal__routine-time">{{ g.name }}</div>
        <TaskRow
          v-for="r in g.rows"
          :key="r.key"
          :task="r.task"
          :kind="r.kind"
          :compact="compact"
          :tick="tick"
          :after="r.after"
        />
      </template>
      <DoneMarks :entries="fill.routine.hidden" />
    </div>
  </div>
  <DoneMarks :entries="fill.hidden" />
</template>
