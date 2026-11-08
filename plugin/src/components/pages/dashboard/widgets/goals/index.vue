<!-- Goals: per goal "X of Y this week", Mon–Sun dots (done, missed, planned or none; the page's day
     ringed), the minimum version and how often it was done -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";
import WinxMissing from "#/components/uikit/WinxMissing.vue";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <WinxMissing v-if="state.data.missing" :path="state.data.path" />
  <div v-else class="winx-goals winx-col winx-gap-l">
    <div
      v-for="g in state.data.goals"
      :key="g.name"
      v-tip="g.plan"
      class="winx-goal"
    >
      <div class="winx-goal__head winx-flex winx-between winx-gap-m">
        <span class="winx-goal__name">{{ g.name }}</span>
        <span class="winx-goal__count">{{ g.count }} this week</span>
      </div>
      <div class="winx-goal__dots winx-flex winx-gap-s">
        <span
          v-for="d in g.dots"
          :key="d.day"
          v-tip="d.day"
          :class="[
            'winx-goal__dot',
            `winx-goal__dot--${d.status}`,
            { 'winx-goal__dot--sel': d.sel },
          ]"
        />
      </div>
      <div v-if="g.min" class="winx-goal__min">{{ g.min }}</div>
    </div>
  </div>
</template>
