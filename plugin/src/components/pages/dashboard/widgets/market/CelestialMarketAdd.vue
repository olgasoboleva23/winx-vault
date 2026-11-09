<!-- the ＋ by Celestial Market's card title: a new item from the search -->
<script setup>
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import { addMarketItem } from "#/controllers/widgets/market.js";
</script>

<template>
  <WinxButton
    kind="add"
    title="add item"
    class="winx-widget__add"
    @click="addMarketItem()"
  >+</WinxButton>
</template>
