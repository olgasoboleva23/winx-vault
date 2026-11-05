<!-- Level and XP: the level, total XP, progress to the next level; HP and MP bars, their reasons in
     the tooltip -->
<script setup>
defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="winx-level winx-row winx-gap-3xl">
    <div class="winx-level__icon winx-center" />
    <div class="winx-level__body winx-grow winx-col winx-gap-xs">
      <div class="winx-level__text">Level: {{ state.data.level }} |
        Total XP: {{ state.data.total }}</div>
      <div class="winx-level__text">Progress: {{ state.data.progress }}/{{ state.data.cost }}</div>
      <div class="winx-level__progress">
        <div class="winx-level__progress-fill" :style="`width:${state.data.fill}%`" />
      </div>
      <div class="winx-level__vitals">
        <div
          v-for="v in state.data.vitals"
          :key="v.name"
          class="winx-level__vital winx-row winx-gap-s"
          :class="`winx-level__vital--${v.mod}`"
          :title="v.title"
        >
          <b class="winx-level__vital-name">{{ v.name }}</b>
          <div class="winx-level__vital-bar winx-grow">
            <i class="winx-level__vital-fill" :style="`width: ${v.width}%`" />
          </div>
          <span class="winx-level__vital-value">{{ v.value }}/{{ v.max }}</span>
        </div>
      </div>
    </div>
  </div>
</template>
