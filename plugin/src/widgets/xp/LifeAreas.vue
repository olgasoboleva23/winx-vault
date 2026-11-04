<!-- Life Areas: the radar of XP per area, the caption under it -->
<script setup>
import WinxChart from "../../vue/WinxChart.vue";
defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <WinxChart :config="state.data.chart" />
  <div class="winx-areas__caption">last 4 weeks</div>
</template>
