<script setup>
import { Notice } from "obsidian";
import { computed, markRaw, onActivated, provide, ref, watch } from "vue";
import { useLater, useNewDay, useRedraw } from "#/composables/use.js";
import { app } from "#/helpers/app.js";
import { useObsidian } from "#/composables/vueApp.ts";
import { tasksApi } from "#/helpers/plugins.js";
import { taskStore } from "#/store/tasks.js";
import config from "#/helpers/config.js";
import { todayYmd } from "#/helpers/dates.js";
import { CalendarData, T, findTask, taskInfo } from "#/models/calendarData.js";
import { baseDate, shownDays } from "#/store/calendar.js";
import { makeActions } from "#/controllers/calendar.js";
import { dragState } from "#/composables/drag.js";
import CalendarTab from "./CalendarTab/index.vue";

defineOptions({ name: "CalendarPage" });
const props = defineProps({ state: { type: Object, required: true } });
const state = props.state, owner = useObsidian(), root = ref(null), version = ref(0);
const data = computed(() => { void version.value; return markRaw(build()); });
const { redraw, catchUp } = useRedraw(owner,
  () => !!root.value?.isConnected && root.value.isShown(), () => { version.value++; });
owner.register(watch(taskStore.version, redraw));
useNewDay(owner, redraw);
onActivated(catchUp);
const view = {
  state, waits: useLater(owner), drag: dragState(),
  get ctx() { return data.value; },
  get actions() { return data.value.actions; },
  info: t => taskInfo(t, data.value, app),
  task(key) {
    const t = data.value.model && findTask(key, data.value.model.all);

    if (!t) new Notice("✦ task changed, try again");
    return t;
  },
};
provide("calendar", view);

function build() {
  if (!taskStore.ready) return { say: "✦ reading the tasks…" };   // the store's first read draws
  const today = todayYmd(), days = shownDays(state, today);
  const { tasks, pool: poolLines } = taskStore;
  // the data, all of it or one area's tasks and pool items
  const data = (area) => new CalendarData({
    tasks: area ? tasks.filter((t) => T(t).area === area) : tasks,
    poolLines: area ? poolLines.filter((l) => l.rec.area === area) : poolLines,
    days, today, areaOrder: Object.keys(config.areaIcons), inProject: taskStore.inProject,
  });
  const ctx = {
    state, today, days, base: baseDate(state, today), view: state.view,
    shown: { open: true, ghost: true, done: state.showDone },
    model: data(state.area),
    everything: state.area ? data(null) : null,   // the tabs' counts, whatever tab is picked
    config, TASKS: tasksApi(), infos: new Map(),
  };
  ctx.actions = makeActions(ctx);
  return ctx;
}
</script>

<template>
  <div ref="root" class="winx-view__page markdown-preview-view markdown-rendered dashboard">
    <CalendarTab />
  </div>
</template>
