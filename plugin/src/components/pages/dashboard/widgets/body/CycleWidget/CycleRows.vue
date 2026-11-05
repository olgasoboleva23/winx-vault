<!-- the cycles: when and how long, and a pill per day (its kind from cycle.js pill()) -->
<script setup>
defineProps({ rows: { type: Array, required: true } });
</script>

<template>
  <div class="winx-cycle__rows">
    <div v-for="r in rows" :key="r.start" class="winx-cycle__row">
      <div
        class="winx-cycle__when winx-flex winx-between winx-gap-s"
      ><span>{{ r.when }}</span><span>{{ r.length }}</span></div>
      <div class="winx-cycle__pills winx-flex winx-gap-2xs">
        <i v-for="(p, i) in r.pills" :key="i" :class="`winx-cycle__pill winx-cycle__pill--${p}`" />
      </div>
    </div>
  </div>
</template>
