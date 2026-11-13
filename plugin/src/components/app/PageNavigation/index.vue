<!-- PageNavigation (block winx-page-navigation): the nav (WinxNav: the floating pill, the phone's
     bottom bar) with the main pages, ⋯ Other when a page isn't main, and Other's drawer
     (WinxDrawer: from the left, the phone's bottom sheet) with those pages: desktop rows with a ↗
     (a new tab), the phone's round icons with their names; ⚙ Settings last (its window, no page).
     A click goes there (Cmd-click: a new tab) -->
<script setup>
import { inject, ref } from "vue";
import { Platform } from "obsidian";
import WinxNav from "#/components/uikit/WinxNav/index.vue";
import WinxDrawer from "#/components/uikit/WinxDrawer/index.vue";
import { openWinx } from "#/components/app/open.ts";
import { pages } from "#/components/app/pages.ts";
import { openSettings } from "#/controllers/settings.js";

const winx = inject("winx");
const phone = Platform.isMobile;
const other = ref(false);   // Other's drawer open

const item = ([key, p]) => ({ key, icon: p.icon, text: p.title });
const entries = Object.entries(pages);
const rest = entries.filter(([, p]) => !p.main).map(item);
const items = [
  ...entries.filter(([, p]) => p.main).map(item),
  ...(rest.length ? [{ key: "other", icon: "⋯", text: "Other" }] : []),
];

function go(key, event) {
  other.value = key === "other" && !other.value;
  if (key !== "other") void winx.go(key, {}, event);
}

// ↗: the page in a new, unpinned Winx tab
function openTab(key) {
  other.value = false;
  void openWinx(key, {}, true);
}

// ⚙ Settings, last in the drawer: its window, not a page
function settings() {
  other.value = false;
  void openSettings();
}
</script>

<template>
  <WinxNav
    class="winx-page-navigation__rail"
    :items="items"
    :current="winx.state.page"
    :phone="phone"
    :expanded="other ? 'other' : null"
    @go="go"
  />
  <WinxDrawer
    class="winx-page-navigation__drawer"
    :open="other"
    :side="phone ? 'bottom' : 'left'"
    label="Other pages"
    @close="other = false"
  >
    <div v-if="!phone" class="winx-page-navigation__head winx-row">
      <span class="winx-page-navigation__crest winx-center" aria-hidden="true">✦</span>
      <span class="winx-page-navigation__title">Winx</span>
    </div>
    <template v-for="p in rest" :key="p.key">
      <button
        v-if="phone"
        type="button"
        class="winx-page-navigation__tile"
        :class="{ 'winx-page-navigation__tile--on': p.key === winx.state.page }"
        @click="go(p.key, $event)"
      >
        <span class="winx-page-navigation__tile-icon winx-center">{{ p.icon }}</span>
        <span class="winx-page-navigation__label">{{ p.text }}</span>
      </button>
      <div
        v-else
        class="winx-page-navigation__row winx-row"
        :class="{ 'winx-page-navigation__row--on': p.key === winx.state.page }"
      >
        <button
          type="button"
          class="winx-page-navigation__go winx-row winx-grow"
          @click="go(p.key, $event)"
        >
          <span class="winx-page-navigation__icon winx-center">{{ p.icon }}</span>
          <span>{{ p.text }}</span>
        </button>
        <button
          type="button"
          class="winx-page-navigation__open-tab winx-center"
          :title="`${p.text} in a new tab`"
          :aria-label="`${p.text} in a new tab`"
          @click="openTab(p.key)"
        >
          ↗
        </button>
      </div>
    </template>
    <button
      v-if="phone"
      type="button"
      class="winx-page-navigation__tile"
      @click="settings"
    >
      <span class="winx-page-navigation__tile-icon winx-center">⚙</span>
      <span class="winx-page-navigation__label">Settings</span>
    </button>
    <div v-else class="winx-page-navigation__row winx-page-navigation__row--last winx-row">
      <button type="button" class="winx-page-navigation__go winx-row winx-grow" @click="settings">
        <span class="winx-page-navigation__icon winx-center">⚙</span>
        <span>Settings</span>
      </button>
    </div>
  </WinxDrawer>
</template>
