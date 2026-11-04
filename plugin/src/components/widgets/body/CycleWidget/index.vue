<!-- Cycle: the day and the next start; unfolded, the cycles as rows of day pills or their lengths
     as columns. The fold (kept per device) and the days / stats tab live here; CycleHead,
     CycleRows, CycleStats draw. -->
<script setup>
import { computed, ref } from "vue";
import { app } from "../../../../core/app.js";
import WinxButton from "../../../uikit/WinxButton.vue";
import WinxEmpty from "../../../uikit/WinxEmpty.vue";
import WinxMissing from "../../../uikit/WinxMissing.vue";
import WinxNoteLink from "../../../uikit/WinxNoteLink.vue";
import { CYCLE_PATH } from "../../../../widgets/body/cycle.js";
import CycleHead from "./CycleHead.vue";
import CycleRows from "./CycleRows.vue";
import CycleStats from "./CycleStats.vue";

const props = defineProps({
  state: { type: Object, required: true },
  actions: { type: Object, required: true },
});

const d = computed(() => props.state.data);
const tab = ref("days");   // or "stats"

// folded unless opened on this device
const open = ref(app.loadLocalStorage("winx-cycle-open") === "1");
const fold = () => {
  open.value = !open.value;
  app.saveLocalStorage("winx-cycle-open", open.value ? "1" : null);
};
const folded = computed(() => !open.value && d.value.info);
</script>

<template>
  <div :class="['winx-cycle', { 'winx-cycle--folded': folded }]">
    <WinxMissing v-if="!d.page" :path="CYCLE_PATH" />
    <WinxEmpty v-else-if="!d.info" text="No data yet" />
    <CycleHead
      v-else
      :head="d.head"
      :open="open"
      @fold="fold"
    />
    <template v-if="!folded && d.rows.length">
      <div class="winx-cycle__tabs">
        <WinxButton kind="toggle" :on="tab === 'days'" @click="tab = 'days'">days</WinxButton>
        <WinxButton kind="toggle" :on="tab === 'stats'" @click="tab = 'stats'">stats</WinxButton>
      </div>
      <CycleStats v-if="tab === 'stats'" :charts="d.charts" />
      <CycleRows v-else :rows="d.rows" />
    </template>
    <div class="winx-cycle__btns">
      <WinxButton
        kind="pill"
        @click="actions.mark(d.mark.kind, d.day)"
      >{{ d.mark.text }}</WinxButton>
      <WinxNoteLink :path="CYCLE_PATH">dates</WinxNoteLink>
    </div>
  </div>
</template>
