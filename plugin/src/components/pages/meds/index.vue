<!-- A medication course (block winx-meds): the counts and the course's progress, today's doses
     by anchor as chips, the course's grid (a mark per day and medicine, a note per day typed into
     the last column), the legend. A mark goes
     round ☐ → ✅ → ❌ on a click (WinxCheckbox, with its sound): the cell changes at once, the
     note's table is written, and the block is drawn again from it -->
<script setup>
import { inject } from "vue";
import WinxCheckbox from "#/components/uikit/WinxCheckbox/index.vue";
import { next } from "#/models/course.js";
import { tickMeds } from "#/controllers/meds.js";
import { playMark } from "#/helpers/sounds.js";

const props = defineProps({ state: { type: Object, required: true } });
const sourcePath = inject("sourcePath");
const today = () => props.state.data.rows.find(r => r.when === "today");
// today's chips show the same cells as the grid's today row
const toggle = (r, col) => {
  const mark = next(r.marks[col]);

  r.marks[col] = mark;
  if (r.when === "today") {
    const items = props.state.data.today.flatMap(g => g.items);

    items.forEach(i => { if (i.col === col) i.mark = mark; });
  }

  void tickMeds(sourcePath, r.date, col, mark);
};

// the day's note, typed into the last column (a | would break the row)
const note = (r, text) => {
  r.note = text.replace(/\|/g, "/").trim();

  void tickMeds(sourcePath, r.date, props.state.data.columns.length, r.note);
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
      <table class="winx-meds__table">
        <thead>
          <tr>
            <th class="winx-meds__th">Дата</th>
            <th v-for="(c, i) in state.data.columns" :key="i" class="winx-meds__th">
              {{ c.code }}{{ c.time }}
            </th>
            <th class="winx-meds__th winx-meds__th--note">Заметки</th>
          </tr>
        </thead>
        <tbody>
          <tr
            v-for="r in state.data.rows"
            :key="r.date"
            :class="['winx-meds__row', `winx-meds__row--${r.when}`]"
          >
            <td class="winx-meds__date">{{ r.label }}</td>
            <td v-for="(m, col) in r.marks" :key="col" class="winx-meds__cell">
              <WinxCheckbox
                v-if="m"
                class="winx-meds__tick"
                :mark="m"
                @tick="toggle(r, col)"
              />
            </td>
            <td class="winx-meds__note">
              <input
                class="winx-meds__note-input"
                type="text"
                :value="r.note"
                placeholder="…"
                @change="note(r, $event.target.value)"
              >
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <div class="winx-meds__legend winx-center winx-wrap winx-gap-xl">
      <span><WinxCheckbox mark="☐" size="s" static /> не отмечено</span>
      <span><WinxCheckbox mark="✅" size="s" static /> принято</span>
      <span><WinxCheckbox mark="❌" size="s" static /> пропущено намеренно</span>
    </div>
  </div>
</template>
