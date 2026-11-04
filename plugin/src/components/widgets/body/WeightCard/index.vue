<!-- Weight: the last value and the change vs a week ago, a field for today, a 30-day line; with a
     body log note, a toggle switches to that log: a level 0–3 and today's reasons, bars over the
     cycle's period days. The mode, the typed weight and the log's picks live here; WeightMode and
     BodyLogMode draw them. -->
<script setup>
import { computed, ref, watch } from "vue";
import WinxButton from "../../../uikit/WinxButton.vue";
import WinxMissing from "../../../uikit/WinxMissing.vue";
import { PATH } from "../../../../widgets/body/weight.js";
import WeightMode from "./WeightMode.vue";
import BodyLogMode from "./BodyLogMode.vue";

const props = defineProps({
  state: { type: Object, required: true },
  actions: { type: Object, required: true },
});

const w = computed(() => props.state.data.weight), log = computed(() => props.state.data.log);
const mode = ref("weight");   // or "log"
const logging = computed(() => mode.value === "log" && !!log.value);

const kg = ref("");
const save = async () => { if (await props.actions.logWeight(kg.value)) kg.value = ""; };

// the log's picks: today's entry until changed
const level = ref(null), reasons = ref([]);
watch(() => log.value?.now, now => {
  level.value = now?.level ?? null;
  reasons.value = [...(now?.reasons ?? [])];
}, { immediate: true });

const saveLog = () => level.value !== null && props.actions.logBody(level.value, reasons.value);
</script>

<template>
  <div class="winx-weight">
    <div v-if="log" class="winx-weight__modes">
      <WinxButton
        kind="toggle"
        :on="mode === 'weight'"
        @click="mode = 'weight'"
      >⚖️ weight</WinxButton>
      <WinxButton
        kind="toggle"
        :on="mode === 'log'"
        @click="mode = 'log'"
      >{{ log.name }}</WinxButton>
    </div>
    <BodyLogMode
      v-if="logging"
      v-model:level="level"
      v-model:reasons="reasons"
      :log="log"
      @save="saveLog"
    />
    <WinxMissing v-else-if="w.missing" :path="PATH" />
    <WeightMode
      v-else
      v-model="kg"
      :weight="w"
      @save="save"
    />
  </div>
</template>
