<!-- The calendar's top: the drop bar (while dragging), the top row, the navigation, the week's
     balance by area -->
<script setup>
import { computed, inject } from "vue";
import DropBar from "./DropBar.vue";
import TopRow from "./TopRow.vue";
import NavRow from "./NavRow.vue";
import BalanceBar from "./BalanceBar.vue";

const view = inject("calendar");
const week = computed(() => view.ctx.view === "week");
</script>

<template>
  <DropBar />
  <TopRow />
  <NavRow />
  <BalanceBar v-if="week" />
</template>
