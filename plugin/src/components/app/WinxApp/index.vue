<!-- The Winx tab's shell (block winx-app): the nav (WinxNav: the floating pill, the phone's
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

// a drawer pick: closes the drawer, then goes there
function pick(key, event) {
  other.value = false;
  void winx.go(key, {}, event);
}
</script>

<template>
  <WinxNav
    :items="items"
    :current="winx.state.page"
    :phone="phone"
    :expanded="other ? 'other' : null"
    @go="go"
  />
  <WinxDrawer
    :open="other"
    :side="phone ? 'bottom' : 'left'"
    label="Other pages"
    @close="other = false"
  >
    <div v-if="!phone" class="winx-app__head winx-row">
      <span class="winx-app__crest winx-center" aria-hidden="true">✦</span>
      <span class="winx-app__title">Winx</span>
    </div>
    <template v-for="p in rest" :key="p.key">
      <button
        v-if="phone"
        type="button"
        class="winx-app__tile"
        :class="{ 'winx-app__tile--on': p.key === winx.state.page }"
        @click="pick(p.key, $event)"
      >
        <span class="winx-app__tile-icon winx-center">{{ p.icon }}</span>
        <span class="winx-app__label">{{ p.text }}</span>
      </button>
      <div
        v-else
        class="winx-app__row winx-row"
        :class="{ 'winx-app__row--on': p.key === winx.state.page }"
      >
        <button type="button" class="winx-app__go winx-row winx-grow" @click="pick(p.key, $event)">
          <span class="winx-app__icon winx-center">{{ p.icon }}</span>
          <span>{{ p.text }}</span>
        </button>
        <button
          type="button"
          class="winx-app__open-tab winx-center"
          :title="`${p.text} in a new tab`"
          :aria-label="`${p.text} in a new tab`"
          @click="openTab(p.key)"
        >
          ↗
        </button>
      </div>
    </template>
    <button v-if="phone" type="button" class="winx-app__tile" @click="settings">
      <span class="winx-app__tile-icon winx-center">⚙</span>
      <span class="winx-app__label">Settings</span>
    </button>
    <div v-else class="winx-app__row winx-app__row--last winx-row">
      <button type="button" class="winx-app__go winx-row winx-grow" @click="settings">
        <span class="winx-app__icon winx-center">⚙</span>
        <span>Settings</span>
      </button>
    </div>
  </WinxDrawer>
</template>
