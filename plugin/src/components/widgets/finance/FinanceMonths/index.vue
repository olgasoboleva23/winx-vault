<!-- Finance: a month's totals, categories against their budgets, the 6-month trend and the latest
     operations; ◀ ▶ step through the months (the shown one is this view's own; a reload keeps it
     while it's there). The shown month lives here; FinanceTotals, FinanceCategories, FinanceTrend,
     FinanceLatest draw it. -->
<script setup>
import { computed, ref } from "vue";
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
  <div class="winx-fin">
    <div
      v-if="state.data.empty"
      class="winx-fin__empty"
    >The ledger is empty: a note per month goes to {{ state.data.path }}</div>
    <template v-else>
      <div class="winx-fin__head">
        <div class="winx-fin__title">{{ m.title }}</div>
        <div class="winx-fin__nav">
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
