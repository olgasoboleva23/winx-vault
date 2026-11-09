<!-- a free journal: a level 0–3 and today's reasons (v-model:level, v-model:reasons), each click
     saved (@save), the 30 days' bars, ✦ list (its note) -->
<script setup>
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxChart from "#/components/uikit/WinxChart/index.vue";
import WinxNoteLink from "#/components/uikit/WinxNoteLink.vue";

defineProps({ log: { type: Object, required: true } });
const emit = defineEmits(["save"]);
const level = defineModel("level", { type: Number, default: null });
const reasons = defineModel("reasons", { type: Array, default: () => [] });

// a level, a reason (on, again: off): saved at once
const set = n => { level.value = n; emit("save"); };

const pick = r => {
  const list = reasons.value;

  reasons.value = list.includes(r) ? list.filter(x => x !== r) : [...list, r];
  emit("save");
};
</script>

<template>
  <div class="winx-weight__log">
    <div class="winx-weight__log-row winx-flex winx-wrap winx-gap-s">
      <WinxButton
        v-for="n in [0, 1, 2, 3]"
        :key="n"
        kind="toggle"
        :on="level === n"
        @click="set(n)"
      >{{ n }}</WinxButton>
    </div>
    <div class="winx-weight__log-row winx-flex winx-wrap winx-gap-s">
      <WinxButton
        v-for="r in log.reasons"
        :key="r"
        kind="toggle"
        :on="reasons.includes(r)"
        @click="pick(r)"
      >{{ r }}</WinxButton>
    </div>
  </div>
  <WinxChart :config="log.chart" />
  <WinxNoteLink :path="log.path" class="winx-weight__list">✦ list</WinxNoteLink>
</template>
