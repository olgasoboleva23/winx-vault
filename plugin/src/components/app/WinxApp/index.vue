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
import WinxButton from "#/components/uikit/WinxButton/index.vue";
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
    <template v-for="p in rest" :key="p.key">
      <div v-if="phone" class="winx-app__cell winx-col winx-center winx-gap-xs">
        <WinxButton kind="round" :title="p.text" @click="pick(p.key, $event)">
          {{ p.icon }}
        </WinxButton>
        <span class="winx-app__label">{{ p.text }}</span>
      </div>
      <div v-else class="winx-app__row winx-row winx-between">
        <WinxButton kind="text" class="winx-grow" @click="pick(p.key, $event)">
          {{ p.icon }} {{ p.text }}
        </WinxButton>
        <WinxButton
          kind="text"
          class="winx-drawer__open-tab"
          :title="`${p.text} in a new tab`"
          @click="openTab(p.key)"
        >
          ↗
        </WinxButton>
      </div>
    </template>
    <div v-if="phone" class="winx-app__cell winx-col winx-center winx-gap-xs">
      <WinxButton kind="round" title="Settings" @click="settings">⚙</WinxButton>
      <span class="winx-app__label">Settings</span>
    </div>
    <div v-else class="winx-app__row winx-row winx-between">
      <WinxButton kind="text" class="winx-grow" @click="settings">⚙ Settings</WinxButton>
    </div>
  </WinxDrawer>
</template>
