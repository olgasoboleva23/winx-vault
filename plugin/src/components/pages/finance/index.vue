<!-- Finance: a month's totals, categories against their budgets, the 6-month trend and the latest
     operations; ◀ ▶ step through the months (the shown one is this view's own; a reload keeps it
     while it's there). The shown month lives here; FinanceTotals, FinanceCategories, FinanceTrend,
     FinanceLatest draw it. -->
<script setup>
import { computed, ref } from "vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";
import FinanceTotals from "./FinanceTotals.vue";
import FinanceCategories from "./FinanceCategories.vue";
import FinanceTrend from "./FinanceTrend.vue";
import FinanceLatest from "./FinanceLatest.vue";

const props = defineProps({ state: { type: Object, required: true } });

const picked = ref(null);
const m = computed(() => {
  const { byMonth, start } = props.state.data;

  return byMonth?.[picked.value] ?? byMonth?.[start];
});
</script>

<template>
  <div class="winx-fin winx-col winx-gap-2xl">
    <WinxEmpty
      v-if="state.data.empty"
      on-background
      :text="`The ledger is empty: a note per month goes to ${state.data.path}`"
    />
    <template v-else>
      <div class="winx-fin__head winx-row winx-between winx-gap-m">
        <div class="winx-fin__title">{{ m.title }}</div>
        <div class="winx-fin__nav winx-flex winx-gap-xs">
          <button class="winx-fin__nav-btn" :disabled="!m.prev" @click="picked = m.prev">◀</button>
          <button class="winx-fin__nav-btn" :disabled="!m.next" @click="picked = m.next">▶</button>
        </div>
      </div>
      <FinanceTotals :totals="m.totals" />
      <div
        v-if="m.transfers"
        class="winx-fin__section"
      >transfers {{ m.transfers }} — not counted as spending</div>
      <FinanceCategories v-if="m.categories.length" :categories="m.categories" />
      <FinanceTrend v-if="m.trend.length" :trend="m.trend" />
      <FinanceLatest v-if="m.latest.length" :latest="m.latest" />
    </template>
  </div>
</template>
