<!-- a chart by the Charts plugin (window.renderChart), block winx-chart: drawn again when its
     config changes, destroyed with it; never wider than its place (index.scss) -->
<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({ config: { type: Object, default: null } });   // null: no chart
const box = ref(null);
let chart = null, runs = 0;

async function draw() {
  const n = ++runs;
  chart?.destroy();
  chart = null;
  box.value?.replaceChildren();
  if (!props.config || !box.value) return;
  const made = await window.renderChart(props.config, box.value);

  if (n !== runs) return made?.destroy();   // a newer config, or gone meanwhile
  chart = made;
}

onMounted(draw);
watch(() => props.config, draw, { flush: "post" });
onBeforeUnmount(() => { runs = -1; chart?.destroy(); });
</script>

<template>
  <div ref="box" class="winx-chart" />
</template>
