<!-- Finance: a month's totals, categories against their budgets, the 6-month trend and the latest operations;
     ◀ ▶ step through the months (the shown one is this view's own; a reload keeps it while it's there) -->
<script setup>
import { computed, ref } from "vue";
const props = defineProps({ state: { type: Object, required: true } });
const picked = ref(null);
const m = computed(() => {
  const { byMonth, start } = props.state.data;
  return byMonth?.[picked.value] ?? byMonth?.[start];
});
</script>

<template>
  <div class="winx-fin">
    <div v-if="state.data.empty" class="winx-fin__empty">The ledger is empty: a note per month goes to {{
      state.data.path }}</div>
    <template v-else>
      <div class="winx-fin__head">
        <div class="winx-fin__title">{{ m.title }}</div>
        <div class="winx-fin__nav">
          <button class="winx-fin__nav-btn" :disabled="!m.prev" @click="picked = m.prev">◀</button>
          <button class="winx-fin__nav-btn" :disabled="!m.next" @click="picked = m.next">▶</button>
        </div>
      </div>
      <div class="winx-fin__totals">
        <div v-for="t in m.totals" :key="t.label" :class="`winx-fin__total winx-fin__total--${t.sign}`">
          <span class="winx-fin__total-label">{{ t.label }}</span>
          <b class="winx-fin__total-value">{{ t.value }}</b>
        </div>
      </div>
      <div v-if="m.transfers" class="winx-fin__section">transfers {{ m.transfers }} — not counted as spending</div>
      <template v-if="m.categories.length">
        <div class="winx-fin__section">Categories</div>
        <div class="winx-fin__rows">
          <div v-for="c in m.categories" :key="c.name" class="winx-fin__row">
            <span>{{ c.name }}</span>
            <span :class="['winx-fin__amt', { 'winx-fin__amt--over': c.over }]">{{ c.amount }}</span>
            <div class="winx-fin__track">
              <div class="winx-fin__fill" :style="{ width: `${c.width}%`, background: c.fill }" />
            </div>
          </div>
        </div>
      </template>
      <template v-if="m.trend.length">
        <div class="winx-fin__section">Spending by month</div>
        <div class="winx-fin__trend">
          <div v-for="b in m.trend" :key="b.month" :class="['winx-fin__bar', { 'winx-fin__bar--current': b.current }]">
            <div class="winx-fin__col" :style="{ height: `${b.height}%` }" :aria-label="b.sum" />
            <small class="winx-fin__bar-label">{{ b.label }}</small>
          </div>
        </div>
      </template>
      <template v-if="m.latest.length">
        <div class="winx-fin__section">Recent transactions</div>
        <div class="winx-fin__list">
          <div v-for="r in m.latest" :key="r.key" class="winx-fin__item">
            <span class="winx-fin__item-date">{{ r.date }}</span>
            <span class="winx-fin__item-text">{{ r.text }}</span>
            <span class="winx-fin__item-sum">{{ r.sum }}</span>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>
