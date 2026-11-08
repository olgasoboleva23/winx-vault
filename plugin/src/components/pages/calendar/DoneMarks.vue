<!-- ✓N: the done tasks hidden (✓ done off), their labels one per line in its title -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";
import { computed, inject } from "vue";

const props = defineProps({ entries: { type: Array, required: true } });
const view = inject("calendar");
const title = computed(() => props.entries.map(e => view.info(e.t).label).join("\n"));
</script>

<template>
  <div v-if="entries.length" class="winx-cal__marks winx-flex winx-gap-m">
    <span v-tip="title">✓{{ entries.length }}</span>
  </div>
</template>
