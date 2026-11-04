<!-- the body log: a level 0–3 and today's reasons (v-model:level, v-model:reasons), Save / Update
     today (@save), the 30 days' bars, ✦ list -->
<script setup>
import WinxButton from "../../../uikit/WinxButton.vue";
import WinxChart from "../../../uikit/WinxChart.vue";
import WinxNoteLink from "../../../uikit/WinxNoteLink.vue";
import { LOG_PATH } from "../../../../widgets/body/weight.js";

defineProps({ log: { type: Object, required: true } });
defineEmits(["save"]);
const level = defineModel("level", { type: Number, default: null });
const reasons = defineModel("reasons", { type: Array, default: () => [] });

// a reason: on, again: off
const pick = r => {
  const list = reasons.value;
  reasons.value = list.includes(r) ? list.filter(x => x !== r) : [...list, r];
};
</script>

<template>
  <div class="winx-weight__log">
    <div class="winx-weight__log-row">
      <WinxButton
        v-for="n in [0, 1, 2, 3]"
        :key="n"
        kind="toggle"
        :on="level === n"
        @click="level = n"
      >{{ n }}</WinxButton>
    </div>
    <div class="winx-weight__log-row">
      <WinxButton
        v-for="r in log.reasons"
        :key="r"
        kind="toggle"
        :on="reasons.includes(r)"
        @click="pick(r)"
      >{{ r }}</WinxButton>
    </div>
    <WinxButton kind="pill" @click="$emit('save')">{{
      log.now ? "Update today" : "Save today" }}</WinxButton>
  </div>
  <WinxChart :config="log.chart" />
  <WinxNoteLink :path="LOG_PATH" cls="winx-weight__list">✦ list</WinxNoteLink>
</template>
