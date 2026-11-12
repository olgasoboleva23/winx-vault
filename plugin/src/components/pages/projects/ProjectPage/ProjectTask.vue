<!-- a task on a stage: its box (ticks it through the Tasks plugin; a done one: ✅, static), the
     calendar's TaskText, and on an open one ✏️ (the task window) and 📅 (a menu: today, tomorrow,
     a date from the row's hidden date field) -->
<script setup>
import { computed, ref } from "vue";
import { Menu } from "obsidian";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxCheckbox from "#/components/uikit/WinxCheckbox/index.vue";
import TaskText from "#/components/pages/calendar/TaskText.vue";
import { app } from "#/helpers/app.js";
import config from "#/helpers/config.js";
import { addDays, todayYmd } from "#/helpers/dates.js";
import { tasksApi } from "#/helpers/plugins.js";
import { editTaskModal, tickTask } from "#/controllers/tasks.js";
import { toCalendar } from "#/controllers/projects.js";
import { taskInfo } from "#/models/calendarData.js";

const props = defineProps({
  entry: { type: Object, required: true },   // stageTasks': { id, t, done }
});
const ctx = { infos: new Map(), config, actions: { canSkip: () => false } };
const info = computed(() => taskInfo(props.entry.t, ctx, app));
const canTick = computed(() => !!tasksApi());
const picker = ref(null);

function dateMenu(e) {
  const t = props.entry.t, today = todayYmd();

  new Menu()
    .addItem(i => i.setTitle("Today").onClick(() => toCalendar(t, today)))
    .addItem(i => i.setTitle("Tomorrow").onClick(() => toCalendar(t, addDays(today, 1))))
    .addItem(i => i.setTitle("Pick a date…").onClick(() => picker.value.showPicker()))
    .showAtMouseEvent(e);
}
</script>

<template>
  <div
    class="winx-project__task winx-row winx-gap-s"
    :style="{ '--area': info.color ?? undefined }"
  >
    <WinxCheckbox v-if="entry.done" mark="✅" static />
    <WinxCheckbox v-else :static="!canTick" @tick="tickTask(entry.t)" />
    <span class="winx-project__task-text winx-grow"><TaskText :task="info" /></span>
    <template v-if="!entry.done">
      <WinxButton title="edit" @click="editTaskModal(entry.t)">✏️</WinxButton>
      <WinxButton title="to the calendar" @click="dateMenu">📅</WinxButton>
      <input
        ref="picker"
        type="date"
        class="winx-project__date"
        tabindex="-1"
        aria-hidden="true"
        @change="e => e.target.value && toCalendar(entry.t, e.target.value)"
      >
    </template>
  </div>
</template>
