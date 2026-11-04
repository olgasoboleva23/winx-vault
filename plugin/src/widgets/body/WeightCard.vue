<!-- Weight: the last value and the change vs a week ago, a field for today, a 30-day line; with a body log note,
     a toggle switches to that log: a level 0–3 and today's reasons, bars over the cycle's period days -->
<script setup>
import { computed, ref, watch } from "vue";
import WinxAddForm from "../../vue/WinxAddForm.vue";
import WinxButton from "../../vue/WinxButton.vue";
import WinxChart from "../../vue/WinxChart.vue";
import WinxMissing from "../../vue/WinxMissing.vue";
import WinxNoteLink from "../../vue/WinxNoteLink.vue";
import { LOG_PATH, PATH } from "./weight.js";

const props = defineProps({ state: { type: Object, required: true }, actions: { type: Object, required: true } });
const w = computed(() => props.state.data.weight), log = computed(() => props.state.data.log);
const mode = ref("weight");   // or "log"
const logging = computed(() => mode.value === "log" && !!log.value);
const INPUT = { name: "kg", type: "number", step: "0.1", inputmode: "decimal", placeholder: "today, kg" };
const kg = ref("");
const save = async () => { if (await props.actions.logWeight(kg.value)) kg.value = ""; };
// the log's picks: today's entry until changed
const level = ref(null), reasons = ref([]);
watch(() => log.value?.now, now => {
  level.value = now?.level ?? null;
  reasons.value = [...(now?.reasons ?? [])];
}, { immediate: true });
const pickReason = r => {
  reasons.value = reasons.value.includes(r) ? reasons.value.filter(x => x !== r) : [...reasons.value, r];
};
const saveLog = () => level.value !== null && props.actions.logBody(level.value, reasons.value);
</script>

<template>
  <div class="winx-weight">
    <div v-if="log" class="winx-weight__modes">
      <WinxButton kind="toggle" :on="mode === 'weight'" @click="mode = 'weight'">⚖️ weight</WinxButton>
      <WinxButton kind="toggle" :on="mode === 'log'" @click="mode = 'log'">{{ log.name }}</WinxButton>
    </div>
    <template v-if="logging">
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
            @click="pickReason(r)"
          >{{ r }}</WinxButton>
        </div>
        <WinxButton kind="pill" @click="saveLog">{{ log.now ? "Update today" : "Save today" }}</WinxButton>
      </div>
      <WinxChart :config="log.chart" />
      <WinxNoteLink :path="LOG_PATH" cls="winx-weight__list">✦ list</WinxNoteLink>
    </template>
    <WinxMissing v-else-if="w.missing" :path="PATH" />
    <template v-else>
      <div class="winx-weight__head">
        <template v-if="w.last">
          <span class="winx-weight__now">{{ w.last.kg }} kg</span>
          <span v-if="w.change !== null" class="winx-weight__delta">{{ w.change }} vs week ago</span>
        </template>
        <span v-else class="winx-weight__delta">no entries yet</span>
      </div>
      <WinxAddForm
        v-model="kg"
        :input="INPUT"
        submit="Save"
        @submit="save"
      />
      <WinxChart v-if="w.chart" :config="w.chart" />
      <WinxNoteLink :path="PATH" cls="winx-weight__list">✦ list</WinxNoteLink>
    </template>
  </div>
</template>
