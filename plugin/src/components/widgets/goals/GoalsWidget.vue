<!-- Goals: per goal "X of Y this week", Mon–Sun dots (done, missed, planned or none; the page's day ringed),
     the minimum version and how often it was done -->
<script setup>
import WinxMissing from "../../uikit/WinxMissing.vue";
defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <WinxMissing v-if="state.data.missing" :path="state.data.path" />
  <div v-else class="winx-goals">
    <div
      v-for="g in state.data.goals"
      :key="g.name"
      class="winx-goal"
      :title="g.plan || null"
    >
      <div class="winx-goal__head">
        <span class="winx-goal__name">{{ g.name }}</span>
        <span class="winx-goal__count">{{ g.count }} this week</span>
      </div>
      <div class="winx-goal__dots">
        <span
          v-for="d in g.dots"
          :key="d.day"
          :class="['winx-goal__dot', `winx-goal__dot--${d.status}`, { 'winx-goal__dot--sel': d.sel }]"
          :title="d.day"
        />
      </div>
      <div v-if="g.min" class="winx-goal__min">{{ g.min }}</div>
    </div>
  </div>
</template>
