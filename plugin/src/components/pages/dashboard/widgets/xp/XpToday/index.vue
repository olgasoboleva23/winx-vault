<!-- XP Today: the day's XP and aura, ↑/↓ against the 7-day average, the month as a heatmap -->
<script setup>
defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="winx-xp">
    <div class="winx-xp__header winx-flex winx-between">
      <div class="winx-xp__aura">
        <span class="winx-xp__icon" aria-hidden="true">🔮</span>
        {{ state.data.aura }} • {{ state.data.todayXP }} XP
      </div>
      <div>{{ state.data.trend }} 7d</div>
    </div>
    <div class="winx-xp__grid">
      <div
        v-for="(v, i) in state.data.vals"
        :key="i"
        :class="`winx-xp__cell winx-xp__cell--v${v}`"
      />
    </div>
    <div class="winx-xp__legend">
      <div
        v-for="l in state.data.legend"
        :key="l.cls"
        class="winx-xp__legend-item"
        :data-tip="l.name"
      >
        <span :class="`winx-xp__swatch winx-xp__swatch--${l.cls}`" />{{ l.max }}
      </div>
    </div>
  </div>
</template>
