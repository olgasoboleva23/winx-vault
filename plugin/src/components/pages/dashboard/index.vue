<script setup>
import { computed, onMounted, ref, watch } from "vue";
import { Platform } from "obsidian";
import { app } from "#/helpers/app.js";
import { useObsidian } from "#/composables/vueApp.ts";
import { useBusy, useNewDay, useNoteLinks } from "#/composables/use.js";
import { todayYmd } from "#/helpers/dates.js";
import { DATA, POMODORO } from "#/helpers/paths.js";
import { blocks } from "#/controllers/blocks.js";
import Widget from "#/components/WinxWidget.vue";
import WinxCard from "#/components/uikit/WinxCard/index.vue";
import DashboardDate from "./DashboardDate.vue";

defineOptions({ name: "DashboardPage" });
const props = defineProps({ state: { type: Object, required: true } });
const state = props.state;
const root = ref(null), owner = useObsidian(), today = ref(todayYmd());
const date = computed(() => state.date ?? today.value);
const go = day => { state.date = day === today.value ? null : day; };

useNewDay(owner, day => { today.value = day; });
watch(date, () => app.workspace.trigger("winx:date"), { flush: "post" });
useBusy(owner, path => path !== POMODORO && path.startsWith(`${DATA}/`),
  () => root.value, "winx-dash--busy");
onMounted(() => useNoteLinks(owner, root.value));
const drawn = () => root.value.classList.remove("winx-dash--busy");
const columns = [
  [["levelToday", "Level"], ["cycle", "Cycle"], ["pomodoro", "Pomodoro"], ["goals", "Goals"]],
  [["lifeAreas", "Life Areas"], ["weight", "Weight"]],
  [["xpToday", "XP Today"], ["quests", "Quests", "scroll"],
    ["celestialMarket", "Celestial", "scroll"]],
];
</script>

<template>
  <div
    ref="root"
    class="winx-view__page markdown-preview-view markdown-rendered dashboard winx-dash"
    :data-date="date"
    @winx-drawn="drawn"
  >
    <div class="winx-busy">
      <div class="winx-busy__pill" title="saving…"><span class="winx-busy__star">✦</span></div>
    </div>
    <div class="winx-dash__content">
      <div class="winx-dash__top">
        <div class="winx-dash__date winx-nav winx-row winx-gap-l">
          <DashboardDate
            :date="date"
            :today="today"
            :phone="Platform.isMobile"
            @go="go"
          />
        </div>
        <Widget :definition="blocks.dailyNote" />
      </div>
      <div class="winx-dash__columns">
        <div v-for="(column, i) in columns" :key="i" class="winx-dash__column">
          <Widget
            v-for="[key, title, meta] in column"
            :key="key"
            :definition="{ ...blocks[key], card: { title, meta: meta ? [meta] : [] } }"
          />
          <WinxCard v-if="i === 2" title="Finance" class="winx-dash__finance">
            <Widget :definition="blocks.financeMonth" />
            <Widget :definition="blocks.savings" />
          </WinxCard>
        </div>
      </div>
    </div>
  </div>
</template>
