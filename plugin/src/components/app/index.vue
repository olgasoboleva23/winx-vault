<script setup>
import { computed, inject, nextTick, watch } from "vue";
import { Platform } from "obsidian";
import { pages } from "./pages.js";
import PageNavigation from "./PageNavigation/index.vue";
import Widget from "#/components/WinxWidget.vue";
import { blocks } from "#/controllers/blocks.js";
import Dashboard from "#/components/pages/dashboard/index.vue";
import Calendar from "#/components/pages/calendar/index.vue";
import Projects from "#/components/pages/projects/index.vue";

const winx = inject("winx"), phone = Platform.isMobile;
const views = { dashboard: Dashboard, calendar: Calendar, projects: Projects };
const page = computed(() => pages[winx.state.page]);
watch(() => winx.state.page, async () => {
  await nextTick();
  winx.app.workspace.trigger("winx:page");
});
</script>

<template>
  <div :class="['winx-view dashboard', { 'winx-view--phone': phone }]" :data-page="winx.state.page">
    <div class="winx-view__pages">
      <KeepAlive :include="['CalendarPage', 'DashboardPage']">
        <component
          :is="views[winx.state.page]"
          v-if="!page.widget"
          :key="winx.state.page"
          :state="winx.state[winx.state.page]"
        />
      </KeepAlive>
      <div
        v-if="page.widget"
        :key="winx.state.page"
        class="winx-view__page markdown-preview-view markdown-rendered dashboard"
      >
        <h2>{{ page.title }}</h2>
        <Widget
          :definition="{
            ...blocks[page.widget], note: page.note,
            card: page.card ? { meta: ['hero'] } : undefined,
          }"
        />
      </div>
    </div>
    <div class="winx-view__nav winx-page-navigation"><PageNavigation /></div>
  </div>
</template>
