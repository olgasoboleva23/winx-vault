<!-- Cycle: the day and the next start; unfolded, the cycles as rows of day pills or their lengths as columns -->
<script setup>
import { computed, ref } from "vue";
import { app } from "../../../core/app.js";
import WinxButton from "../../uikit/WinxButton.vue";
import WinxEmpty from "../../uikit/WinxEmpty.vue";
import WinxMissing from "../../uikit/WinxMissing.vue";
import WinxNoteLink from "../../uikit/WinxNoteLink.vue";
import { CYCLE_PATH } from "../../../widgets/body/cycle.js";

const props = defineProps({ state: { type: Object, required: true }, actions: { type: Object, required: true } });
const d = computed(() => props.state.data);
const tab = ref("days");   // or "stats"
// folded unless opened on this device
const open = ref(app.loadLocalStorage("winx-cycle-open") === "1");
const fold = () => { open.value = !open.value; app.saveLocalStorage("winx-cycle-open", open.value ? "1" : null); };
const folded = computed(() => !open.value && d.value.info);
const h = computed(() => d.value.head);   // the head: the day, its phase, the next start
const PHASE = "winx-cycle__phase";
const dayClass = computed(() => ["winx-cycle__day", { "winx-cycle__day--period": h.value?.period }]);
</script>

<template>
  <div :class="['winx-cycle', { 'winx-cycle--folded': folded }]">
    <WinxMissing v-if="!d.page" :path="CYCLE_PATH" />
    <WinxEmpty v-else-if="!d.info" text="No data yet" />
    <div
      v-else
      class="winx-cycle__head"
      :title="open ? 'fold' : 'show the cycles'"
      @click="fold"
    >
      <div :class="dayClass" :title="h.title">day {{ h.day }}<span :class="PHASE"> · {{ h.phase }}</span></div>
      <div class="winx-cycle__next">next ~{{ h.next }}, {{ h.when }}</div>
    </div>
    <template v-if="!folded && d.rows.length">
      <div class="winx-cycle__tabs">
        <WinxButton kind="toggle" :on="tab === 'days'" @click="tab = 'days'">days</WinxButton>
        <WinxButton kind="toggle" :on="tab === 'stats'" @click="tab = 'stats'">stats</WinxButton>
      </div>
      <template v-if="tab === 'stats'">
        <div v-for="c in d.charts" :key="c.kind" :class="`winx-cycle__chart winx-cycle__chart--${c.kind}`">
          <div class="winx-cycle__chart-title">{{ c.title }}<span class="winx-cycle__chart-avg">{{ c.avg }}</span></div>
          <div class="winx-cycle__cols">
            <b class="winx-cycle__avg-line" :style="`bottom: ${c.line}%`" />
            <i
              v-for="(col, i) in c.cols"
              :key="i"
              class="winx-cycle__col"
              :style="`height: ${col.height}%`"
            >
              <span class="winx-cycle__col-value">{{ col.v }}</span>
            </i>
          </div>
        </div>
      </template>
      <div v-else class="winx-cycle__rows">
        <div v-for="r in d.rows" :key="r.start" class="winx-cycle__row">
          <div class="winx-cycle__when"><span>{{ r.when }}</span><span>{{ r.length }}</span></div>
          <div class="winx-cycle__pills">
            <i v-for="(p, i) in r.pills" :key="i" :class="`winx-cycle__pill winx-cycle__pill--${p}`" />
          </div>
        </div>
      </div>
    </template>
    <div class="winx-cycle__btns">
      <WinxButton kind="pill" @click="actions.mark(d.mark.kind, d.day)">{{ d.mark.text }}</WinxButton>
      <WinxNoteLink :path="CYCLE_PATH">dates</WinxNoteLink>
    </div>
  </div>
</template>
