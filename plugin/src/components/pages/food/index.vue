<!-- The food journal (block winx-food): a week, ‹ › to step it, today back; a row a day: what was
     eaten (✎ a food by its name, × takes it off, ＋ adds one: a fuzzy search, or a new food with its
     marks), the marks counted, each free journal's level after its lag (the reasons in the tip),
     💊 the medication courses on that day, the day's note. ⚙ edits the marks -->
<script setup>
import { computed, ref } from "vue";
import { Notice } from "obsidian";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxInput from "#/components/uikit/WinxInput/index.vue";
import WinxTable from "#/components/uikit/WinxTable/index.vue";
import WinxNoteLink from "#/components/uikit/WinxNoteLink.vue";
import { vTip } from "#/components/uikit/tooltip.js";
import { addDays, weekOf } from "#/helpers/dates.js";
import { dayLabel } from "#/models/course.js";
import { FoodLog, foodWeek } from "#/models/food.js";
import { addEaten, editFood, editMarks, removeEaten, setFoodNote } from "#/controllers/food.js";

const props = defineProps({ state: { type: Object, required: true } });
const d = computed(() => props.state.data);
const monday = ref(weekOf(d.value.today)[0]);
const days = computed(() => weekOf(monday.value));
const short = date => dayLabel(date).split(",")[0];
const step = n => { monday.value = n ? addDays(monday.value, 7 * n) : weekOf(d.value.today)[0]; };

const rows = computed(() => foodWeek({
  ...d.value, log: new FoodLog(d.value.log), days: days.value,
}).map(r => ({ ...r, label: dayLabel(r.date), when: r.date === d.value.today ? "today" : "" })));
const columns = computed(() => [
  { key: "label", label: "День", class: "winx-food__day" },
  { key: "items", label: "Еда", class: "winx-food__items" },
  ...d.value.marks.map(m => ({
    key: `mark:${m.tag}`, label: m.icon, align: "center", tip: m.name, tag: m.tag,
  })),
  ...d.value.journals.map((j, i) => ({
    key: `journal:${i}`, label: j.lag ? `${j.name} +${j.lag}д` : j.name, align: "center", i,
    tip: j.lag ? `уровень через ${j.lag} дн. после еды` : "уровень в тот же день",
  })),
  { key: "courses", label: "💊", align: "center", tip: "курс лекарств в этот день" },
  { key: "note", label: "Заметка", class: "winx-food__note" },
]);

// a write: a failure said (the page draws again from the files when one works)
const act = async (write) => {
  try { await write(); } catch (e) { console.error(e); new Notice(`✦ Not saved (${e.message})`); }
};
</script>

<template>
  <div class="winx-food">
    <div class="winx-food__head winx-row winx-gap-m">
      <WinxButton
        kind="nav"
        title="previous week"
        class="winx-food__prev"
        @click="step(-1)"
      >‹</WinxButton>
      <span class="winx-food__week">{{ short(days[0]) }} – {{ short(days[6]) }}</span>
      <WinxButton
        kind="nav"
        mirrored
        title="next week"
        class="winx-food__next"
        @click="step(1)"
      >‹</WinxButton>
      <WinxButton kind="chip" title="this week" @click="step(0)">today</WinxButton>
      <span class="winx-grow" />
      <WinxButton kind="text" title="the marks" @click="act(editMarks)">⚙</WinxButton>
    </div>
    <div class="winx-food__grid">
      <WinxTable
        :columns="columns"
        :rows="rows"
        bordered
        :row-key="r => r.date"
        :row-class="r => (r.when ? `winx-food__row--${r.when}` : null)"
      >
        <template #cell="{ row, col }">
          <template v-if="col.key === 'label'">{{ row.label }}</template>
          <div v-else-if="col.key === 'items'" class="winx-flex winx-wrap winx-gap-xs">
            <span v-for="(f, n) in row.items" :key="n" class="winx-food__item">
              <span
                v-tip="'edit the food'"
                class="winx-food__item-name"
                @click="act(() => editFood(f.id))"
              >{{ f.name }}{{ f.icons ? ` ${f.icons}` : "" }}</span>
              <span class="winx-food__off" @click="act(() => removeEaten(row.date, n))">×</span>
            </span>
            <WinxButton
              kind="text"
              title="add what was eaten"
              @click="act(() => addEaten(row.date))"
            >＋</WinxButton>
          </div>
          <span v-else-if="col.tag" class="winx-food__count">{{ row.counts[col.tag] || "" }}</span>
          <span
            v-else-if="col.key.startsWith('journal:') && row.journals[col.i].level !== null"
            v-tip="row.journals[col.i].reasons.join(', ')"
            class="winx-food__level"
          >{{ row.journals[col.i].level }}</span>
          <template v-else-if="col.key === 'courses'">
            <span v-for="c in row.courses" :key="c.path" class="winx-row winx-gap-xs">
              <WinxNoteLink :path="c.path" class="winx-food__course">💊</WinxNoteLink>
              <span
                v-for="m in c.meds"
                :key="m.code"
                v-tip="m.taken ? m.name : `${m.name}: не принято`"
                :class="['winx-food__med', { 'winx-food__med--not': !m.taken }]"
              >{{ m.code }}</span>
            </span>
          </template>
          <WinxInput
            v-else-if="col.key === 'note'"
            kind="inline"
            :model-value="row.note"
            placeholder="…"
            @change="act(() => setFoodNote(row.date, $event.target.value))"
          />
        </template>
      </WinxTable>
    </div>
  </div>
</template>
