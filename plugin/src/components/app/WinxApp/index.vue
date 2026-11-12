<!-- The Winx tab's shell (block winx-app): the nav (WinxNav: the floating pill, the phone's
     bottom bar) with the main pages, ⋯ Other when a page isn't main, and Other's drawer
     (WinxDrawer: from the left, the phone's bottom sheet) with those pages. A click goes there
     (Cmd-click: a new tab) -->
<script setup>
import { inject, ref } from "vue";
import { Platform } from "obsidian";
import WinxNav from "#/components/uikit/WinxNav/index.vue";
import WinxDrawer from "#/components/uikit/WinxDrawer/index.vue";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import { pages } from "#/components/app/pages.ts";

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
    <WinxButton
      v-for="p in rest"
      :key="p.key"
      kind="rail"
      :title="p.text"
      @click="go(p.key, $event)"
    >
      {{ p.icon }} {{ p.text }}
    </WinxButton>
  </WinxDrawer>
</template>
