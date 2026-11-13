<script>
// Preserve a Markdown block's height while its replacement loads.
const heights = new WeakMap();
</script>

<script setup>
import {
  nextTick, onMounted, onActivated, onErrorCaptured, provide, reactive, ref, watch,
} from "vue";
import { useObsidian } from "#/composables/vueApp.ts";
import {
  useDataviewChanges, useFileChanges, useRedraw, useTabDate, useWhenIndexed,
} from "#/composables/use.js";
import { app } from "#/helpers/app.js";
import { blockDv } from "#/helpers/plugins.js";
import { taskStore } from "#/store/tasks.js";
import { TASKS } from "#/helpers/paths.js";
import WinxCard from "#/components/uikit/WinxCard/index.vue";
import WinxFailed from "#/components/uikit/WinxFailed.vue";

const props = defineProps({ definition: { type: Object, required: true } });
const root = ref(null), owner = useObsidian(), state = reactive({ data: null, error: null });
const def = props.definition, sourcePath = def.note ?? "";
const kept = heights.get(def.view)?.get(sourcePath);
const el = () => root.value?.$el ?? root.value;
const retry = () => void refresh();
let runs = 0, gone = false;
owner.register(() => { gone = true; });
provide("sourcePath", sourcePath);
provide("retry", retry);
onErrorCaptured(error => { state.error = error.message; console.error(error); return false; });

async function refresh() {
  const n = ++runs;

  try {
    const data = await def.load({ get dv() { return blockDv(sourcePath, el()); }, app,
      args: def.args ?? {}, sourcePath, source: def.source ?? "" });

    if (gone || n !== runs) return;
    Object.assign(state, { data, error: null });
    await nextTick();
    if (gone || n !== runs) return;
    const body = el().querySelector(".winx-widget__body") ?? el();

    if (!heights.has(def.view)) heights.set(def.view, new Map());
    heights.get(def.view).set(sourcePath, body.offsetHeight);
    el().dispatchEvent(new CustomEvent("winx-drawn", { bubbles: true }));
  } catch (error) {
    if (gone || n !== runs) return;
    console.error(error);
    state.error = error.message;
  }
}

let catchUp = () => {};

onActivated(() => catchUp());
onMounted(() => {
  if (def.follows === false) return retry();
  const redraws = useRedraw(owner, () => el().isConnected && el().isShown(), retry);
  const { redraw } = redraws;

  catchUp = redraws.catchUp;
  owner.registerEvent(app.workspace.on("winx:theme", redraw));
  const taskFiles = `${TASKS}/`, others = def.watches?.filter(w => w !== taskFiles);
  const watched = others && (path =>
    others.some(w => w.endsWith("/") ? path.startsWith(w) : path === w));

  if (def.watches?.includes(taskFiles)) owner.register(watch(taskStore.version, redraw));
  useDataviewChanges(owner, redraw, { watched, note: def.note, delay: 1000 });
  const plain = others?.filter(w => !w.endsWith("/") && !w.endsWith(".md"));

  if (plain?.length) useFileChanges(owner, redraw, plain);
  useTabDate(owner, el(), retry);
  useWhenIndexed(owner, retry);
});
defineExpose({ state, refresh });
</script>

<template>
  <component
    :is="def.card ? WinxCard : 'div'"
    ref="root"
    v-bind="def.card"
    :class="def.bodyClass"
  >
    <template v-if="def.cardButton" #button><component :is="def.cardButton" /></template>
    <WinxFailed v-if="state.error" :text="state.error" @retry="retry" />
    <div
      v-else-if="state.data === null"
      class="winx-widget__skeleton"
      :style="kept ? { minHeight: `${kept}px` } : null"
    />
    <component :is="def.view" v-else :state="state" />
  </component>
</template>
