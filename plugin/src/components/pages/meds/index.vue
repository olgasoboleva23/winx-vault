<!-- A medication course (block winx-meds): the counts and the course's progress, today's doses
     by anchor as chips, the course's grid (a mark per day and medicine, a note per day typed into
     the last column), the legend (the codes, the times of day, the marks). A mark goes
     round ☐ → ✅ → ❌ on a click (WinxCheckbox, with its sound): the cell changes at once, the
     note's table is written, and the block is drawn again from it -->
<script setup>
import { computed, inject } from "vue";
import { Notice } from "obsidian";
import WinxCheckbox from "#/components/uikit/WinxCheckbox/index.vue";
import WinxInput from "#/components/uikit/WinxInput/index.vue";
import WinxTable from "#/components/uikit/WinxTable/index.vue";
import { TIMES, next } from "#/models/course.js";
import { tickMeds } from "#/controllers/meds.js";
import { playMark } from "#/helpers/sounds.js";

const props = defineProps({ state: { type: Object, required: true } });
// the legend under the grid: the codes' medicines, the times of day in use
const codes = computed(() => [...new Map(props.state.data.columns.map(c => [c.code, c.name]))]);
const times = computed(() =>
  [...new Set(props.state.data.columns.map(c => c.time).filter(Boolean))].map(t => TIMES[t]));
// the grid's columns: the date, a medicine (its code and time) each, the day's note
const columns = computed(() => [
  { key: "label", label: "Дата", class: "winx-meds__date" },
  ...props.state.data.columns.map((c, col) => ({
    key: `m${col}`, label: c.code + c.time, align: "center", col,
    tip: `${c.name}, ${TIMES[c.time]}`,
  })),
  { key: "note", label: "Заметки", class: "winx-meds__note" },
]);
const sourcePath = inject("sourcePath");
const today = () => props.state.data.rows.find(r => r.when === "today");

// a cell shown at once, then written; a write that fails puts it back and says so
async function write(r, col, value, undo) {
  try {
    await tickMeds(sourcePath, r.date, col, value);
  } catch (e) {
    console.error(e);
    undo();
    new Notice(`✦ Not saved (${e.message}): try again`);
  }
}

// today's chips show the same cells as the grid's today row
const mark = (r, col, m) => {
  r.marks[col] = m;
  if (r.when !== "today") return;
  props.state.data.today.flatMap(g => g.items).forEach(i => { if (i.col === col) i.mark = m; });
};

const toggle = (r, col) => {
  const was = r.marks[col];

  mark(r, col, next(was));
  return write(r, col, r.marks[col], () => mark(r, col, was));
};

// the day's note, typed into the last column (a | would break the row)
const note = (r, el) => {
  const was = r.note;

  r.note = el.value.replace(/\|/g, "/").trim();
  return write(r, props.state.data.columns.length, r.note, () => { r.note = was; el.value = was; });
};
</script>

<template>
  <div class="winx-meds">
    <div class="winx-meds__sum">
      день {{ state.data.day }} из {{ state.data.days }}
      · принято {{ state.data.taken }} из {{ state.data.due }}
    </div>
    <div class="winx-meds__bar">
      <span
        class="winx-meds__bar-fill"
        :style="{ width: `${Math.min(100, 100 * state.data.day / (state.data.days || 1))}%` }"
      />
    </div>
    <div v-if="state.data.today" class="winx-meds__today winx-col winx-gap-m">
      <div v-for="g in state.data.today" :key="g.label" class="winx-meds__zone">
        <div class="winx-meds__zone-label">
          <b v-if="g === state.data.today[0]">Сегодня</b> {{ g.label }}
        </div>
        <div class="winx-flex winx-wrap winx-gap-m">
          <button
            v-for="i in g.items"
            :key="i.col"
            class="winx-meds__chip"
            :data-mark="i.mark"
            @click="toggle(today(), i.col); playMark(i.mark)"
          ><WinxCheckbox :mark="i.mark" static />{{ i.name }}</button>
        </div>
      </div>
    </div>
    <div class="winx-meds__grid">
      <WinxTable
        :columns="columns"
        :rows="state.data.rows"
        :row-key="r => r.date"
        :row-class="r => `winx-meds__row--${r.when}`"
      >
        <template #cell="{ row, col }">
          <template v-if="col.key === 'label'">{{ row.label }}</template>
          <WinxInput
            v-else-if="col.key === 'note'"
            kind="inline"
            class="winx-meds__note-input"
            :model-value="row.note"
            placeholder="…"
            @change="note(row, $event.target)"
          />
          <WinxCheckbox
            v-else-if="row.marks[col.col]"
            class="winx-meds__tick"
            :mark="row.marks[col.col]"
            @tick="toggle(row, col.col)"
          />
        </template>
      </WinxTable>
    </div>
    <div class="winx-meds__legend winx-center winx-wrap winx-gap-xl">
      <span v-for="[code, name] in codes" :key="code"><b>{{ code }}</b> {{ name }}</span>
      <span v-for="t in times" :key="t">{{ t }}</span>
    </div>
    <div class="winx-meds__legend winx-center winx-wrap winx-gap-xl">
      <span><WinxCheckbox mark="☐" size="s" static /> не отмечено</span>
      <span><WinxCheckbox mark="✅" size="s" static /> принято</span>
      <span><WinxCheckbox mark="❌" size="s" static /> пропущено намеренно</span>
    </div>
  </div>
</template>
