<!-- Celestial Market: the list by category, a round ✓ per item (the sparkle plays, then it's
     written as bought), what runs low soon, and links to the market and the supplies -->
<script setup>
import { reactive, watch } from "vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";
import WinxMissing from "#/components/uikit/WinxMissing.vue";
import WinxGroupHeader from "#/components/uikit/WinxGroupHeader.vue";
import WinxNoteLink from "#/components/uikit/WinxNoteLink.vue";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import { MARKET, SUPPLIES } from "#/helpers/paths.js";
import { buyMarketItem } from "#/controllers/widgets/market.js";

const props = defineProps({ state: { type: Object, required: true } });
const LINKS = [
  { text: "✦ open market", path: MARKET },
  { text: "✦ supplies", path: SUPPLIES },
];
// rows being bought: sparkling from the click until the list no longer has them (written), or the
// write didn't happen (the line moved meanwhile)
const bought = reactive(new Set());
const key = r => `${r.line}|${r.id ?? r.name}`;

async function buy(r) {
  if (bought.has(key(r))) return;
  bought.add(key(r));
  await new Promise(done => setTimeout(done, 650));   // the sparkle first
  let written = false;

  try {
    written = await buyMarketItem(r);
  } finally {
    if (!written) bought.delete(key(r));
  }
}

// a row gone from the list lets go of its mark: back on the list later, it can be bought again
watch(() => props.state.data.groups, groups => {
  const shown = new Set((groups ?? []).flatMap(g => g.rows.map(key)));

  for (const k of bought) if (!shown.has(k)) bought.delete(k);
});
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
          class="winx-market__item winx-row winx-gap-l"
          :class="{ 'winx-market__item--bought': bought.has(key(r)) }"
        >
          <span class="winx-market__text winx-grow">{{ r.name }}</span>
          <WinxButton
            kind="add"
            jump
            title="bought"
            @click="buy(r)"
          >
            <svg class="winx-market__tick" viewBox="0 0 40 26" aria-hidden="true">
              <path
                d="M14 13.5l4 4 8-8.5"
                fill="none"
                stroke="#fff"
                stroke-width="2.8"
                stroke-linecap="round"
                stroke-linejoin="round"
              />
            </svg>
          </WinxButton>
        </div>
      </template>
    </div>
    <div
      v-if="state.data.soon"
      class="winx-market__soon"
    >⏳ running low soon: {{ state.data.soon }}</div>
    <div class="winx-market__footer">
      <span>{{ state.data.left }}</span>
      <WinxNoteLink
        v-for="l in LINKS"
        :key="l.path"
        :path="l.path"
        kind="text"
        class="winx-market__link"
      >
        {{ l.text }}
      </WinxNoteLink>
    </div>
  </div>
</template>
