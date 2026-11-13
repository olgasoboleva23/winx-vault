<!-- the dashboard's Finance card: this month's spent and income on one line, the Finance page a tap
     away -->
<script setup>
import { inject } from "vue";
import { Keymap } from "obsidian";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import { openWinx } from "#/components/app/open.ts";

const winx = inject("winx", null);
const open = e => winx ? winx.go("finance", {}, e)
  : openWinx("finance", {}, Keymap.isModEvent(e));

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="winx-fin-month">
    <div v-if="!state.data.empty">{{ state.data.month }}: spent
      <b class="winx-fin-month__sum">{{ state.data.spent }}</b> · income
      <b class="winx-fin-month__sum">{{ state.data.income }}</b></div>
    <WinxButton kind="text" @click="open">💰 open finance</WinxButton>
  </div>
</template>
