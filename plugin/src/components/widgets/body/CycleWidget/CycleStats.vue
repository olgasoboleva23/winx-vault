<!-- the stats: the cycles' and the periods' lengths as columns, the average as a line across -->
<script setup>
defineProps({ charts: { type: Array, required: true } });
</script>

<template>
  <div v-for="c in charts" :key="c.kind" :class="`winx-cycle__chart winx-cycle__chart--${c.kind}`">
    <div class="winx-cycle__chart-title">{{ c.title }}<span class="winx-cycle__chart-avg">{{
      c.avg }}</span></div>
    <div class="winx-cycle__cols">
      <b class="winx-cycle__avg-line" :style="`bottom: ${c.line}%`" />
      <i
        v-for="(col, i) in c.cols"
        :key="i"
        class="winx-cycle__col"
        :style="`height: ${col.height}%`"
      >
        <span class="winx-cycle__col-value">{{ col.v }}</span>
      </i>
    </div>
  </div>
</template>
