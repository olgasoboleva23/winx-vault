<!-- the week's balance: one bar of the week's tasks split by area (the six of the areas list),
     each piece labelled with its icon and done / all, the done part brighter; an area with none
     this week a grey icon after it. A piece: only that area's tasks; again: all -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";
import { computed, inject } from "vue";

const view = inject("calendar");
const state = view.state;

const balance = computed(() => {
  const { config: { areas }, everything, model } = view.ctx;
  const b = (everything ?? model).balance(areas.map(a => a.tag));
  const name = tag => areas.find(a => a.tag === tag).label;
  const icon = tag => name(tag).split(" ")[0];

  return {
    pieces: b.filter(x => x.planned).map(x => ({
      on: x.area === state.area, area: x.area.slice(6), style: `flex: ${x.planned}`,
      icon: icon(x.area),
      title: `${name(x.area)}: ${x.done} of ${x.planned} done`, count: `${x.done}/${x.planned}`,
      fill: `width: ${Math.round(x.done / x.planned * 100)}%`,
    })),
    none: b.filter(x => !x.planned)
      .map(x => ({ icon: icon(x.area), title: `${name(x.area)}: nothing this week` })),
  };
});

const pickArea = a => { const tag = `#area/${a}`; state.area = tag === state.area ? null : tag; };
</script>

<template>
  <div class="winx-cal__balance" data-part="header">
    <div
      class="winx-cal__balance-bar winx-grow winx-flex winx-gap-2xs"
      :class="{ 'winx-cal__balance-bar--picked': !!state.area }"
    >
      <div
        v-for="p in balance.pieces"
        :key="p.area"
        v-tip="p.title"
        :class="['winx-cal__area', { 'winx-cal__area--on': p.on }]"
        :data-area="p.area"
        :style="p.style"
        @click="pickArea(p.area)"
      >
        <span class="winx-cal__area-label">{{ p.icon }} {{ p.count }}</span>
        <b class="winx-cal__area-track"><i class="winx-cal__area-fill" :style="p.fill" /></b>
      </div>
    </div>
    <div
      v-if="balance.none.length"
      v-tip="'nothing this week'"
      class="winx-cal__balance-none winx-flex winx-gap-2xs"
    >
      <span v-for="x in balance.none" :key="x.title" v-tip="x.title">{{ x.icon }}</span>
    </div>
  </div>
</template>
