<!-- the weight: the last value and the change vs a week ago, a field for today (v-model: what's
     typed; @save), the 30-day line, ✦ list -->
<script setup>
import WinxAddForm from "../../../uikit/WinxAddForm.vue";
import WinxChart from "../../../uikit/WinxChart.vue";
import WinxNoteLink from "../../../uikit/WinxNoteLink.vue";
import { PATH } from "../../../../widgets/body/weight.js";

defineProps({ weight: { type: Object, required: true } });
defineEmits(["save"]);
const kg = defineModel({ type: [String, Number], default: "" });

const INPUT = {
  name: "kg", type: "number", step: "0.1", inputmode: "decimal", placeholder: "today, kg",
};
</script>

<template>
  <div class="winx-weight__head">
    <template v-if="weight.last">
      <span class="winx-weight__now">{{ weight.last.kg }} kg</span>
      <span
        v-if="weight.change !== null"
        class="winx-weight__delta"
      >{{ weight.change }} vs week ago</span>
    </template>
    <span v-else class="winx-weight__delta">no entries yet</span>
  </div>
  <WinxAddForm
    v-model="kg"
    :input="INPUT"
    submit="Save"
    @submit="$emit('save')"
  />
  <WinxChart v-if="weight.chart" :config="weight.chart" />
  <WinxNoteLink :path="PATH" class="winx-weight__list">✦ list</WinxNoteLink>
</template>
