<!-- Celestial Market: the list by category, a round ✓ per item (the sparkle plays, then it's written as bought),
     what runs low soon, and links to the market and the supplies -->
<script setup>
import { reactive } from "vue";
import WinxEmpty from "../../vue/WinxEmpty.vue";
import WinxMissing from "../../vue/WinxMissing.vue";
import WinxGroupHeader from "../../vue/WinxGroupHeader.vue";
import WinxNoteLink from "../../vue/WinxNoteLink.vue";

const props = defineProps({ state: { type: Object, required: true }, actions: { type: Object, required: true } });
const LINKS = [
  { text: "✦ open market", path: "00 System/Data/Celestial Market" },
  { text: "✦ supplies", path: "00 System/Data/Supplies" },
];
const bought = reactive(new Set());   // rows sparkling until the write redraws the list
const key = r => `${r.line}|${r.name}`;
async function buy(r) {
  if (bought.has(key(r))) return;
  bought.add(key(r));
  await new Promise(done => setTimeout(done, 650));   // the sparkle first
  await props.actions.buy(r);
}
</script>

<template>
  <WinxMissing v-if="state.data.missing" :path="state.data.path" />
  <div v-else class="winx-market">
    <div class="winx-market__list">
      <WinxEmpty v-if="state.data.empty" text="Merchant inventory cleared" />
      <template v-for="g in state.data.groups" :key="g.label">
        <WinxGroupHeader :label="g.label" :count="g.rows.length" />
        <div
          v-for="r in g.rows"
          :key="key(r)"
          :class="['winx-market__item', { 'winx-market__item--bought': bought.has(key(r)) }]"
        >
          <span class="winx-market__text">{{ r.name }}</span>
          <button
            class="winx-market__buy"
            aria-label="bought"
            title="bought"
            @click="buy(r)"
          />
        </div>
      </template>
    </div>
    <div v-if="state.data.soon" class="winx-market__soon">⏳ running low soon: {{ state.data.soon }}</div>
    <div class="winx-market__footer">
      <span>{{ state.data.left }}</span>
      <WinxNoteLink
        v-for="l in LINKS"
        :key="l.path"
        :path="l.path"
        kind="text"
        cls="winx-market__link"
      >
        {{ l.text }}
      </WinxNoteLink>
    </div>
  </div>
</template>
