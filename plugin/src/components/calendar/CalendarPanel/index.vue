<!-- The bottom panel: No date | Ahead | Regulars | Pool, one card per area (Ahead: per month);
     a drop here takes the date off. Only it shows the tab and the backlog's cut, so switching them
     redraws only it -->
<script setup>
import { computed, inject, provide, reactive, watch } from "vue";
import PanelTabs from "./PanelTabs.vue";
import NoDateTab from "./NoDateTab.vue";
import AheadTab from "./AheadTab.vue";
import PoolTab from "./PoolTab.vue";
import RegularsTab from "./RegularsTab.vue";
import { SHOWN } from "./groups.js";

const view = inject("calendar");
const state = view.state;

// Regulars' ⏸ / ▶ shown at once, until the new data comes: here, so a tab switch meanwhile keeps it
const flipped = reactive(new Set());
watch(() => view.ctx, () => flipped.clear());
provide("flipped", flipped);

// No date's "show all N" / "show less", under its cards
const more = computed(() => {
  const n = view.ctx.model.backlog.length;
  if (state.tab !== "nodate" || n <= SHOWN) return null;
  return state.backlogOpen ? "show less" : `show all ${n}`;
});

const toggleMore = () => { state.backlogOpen = !state.backlogOpen; };
</script>

<template>
  <div class="winx-cal__backlog winx-board-backlog" data-drop="" data-part="panel">
    <PanelTabs />
    <div class="winx-cal__backlog-grid">
      <NoDateTab v-if="state.tab === 'nodate'" />
      <AheadTab v-else-if="state.tab === 'ahead'" />
      <PoolTab v-else-if="state.tab === 'pool'" />
      <RegularsTab v-else />
    </div>
    <button v-if="more" class="winx-cal__more" @click="toggleMore">{{ more }}</button>
  </div>
</template>
