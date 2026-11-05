<!-- Shop: the gold balance and the rewards; an affordable one is bought with a click, the rest are
     greyed out -->
<script setup>
const props = defineProps({
  state: { type: Object, required: true },
  actions: { type: Object, required: true },
});
// bought: drawn again at once (the balance), as before
const buy = async i => { if (await props.actions.buy(i.name, i.cost)) props.actions.retry(); };
</script>

<template>
  <div class="winx-shop__balance">
    <span class="winx-shop__balance-icon">✨</span>
    <span>Gold</span>
    <span class="winx-shop__balance-amount">{{ state.data.balance }}</span>
  </div>
  <div class="winx-shop__items">
    <button
      v-for="i in state.data.items"
      :key="i.name"
      class="winx-shop__item"
      :disabled="!i.affordable"
      @click="buy(i)"
    >
      <span class="winx-shop__item-name">{{ i.name }}</span>
      <span class="winx-shop__item-cost">{{ i.cost }} ✨</span>
    </button>
  </div>
</template>
