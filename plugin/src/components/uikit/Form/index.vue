<!-- The Form window's content (Form/index.ts opens it): the tabs (WinxTabs) and a pane a tab, one
     shown at a time, the rows without a tab, then the button (greyed out until `ready`) -->
<script setup>
import { ref } from "vue";
import WinxTabs from "#/components/uikit/WinxTabs/index.vue";
import FormRow from "./FormRow.vue";

const props = defineProps({
  rows: { type: Array, required: true },
  values: { type: Object, required: true },   // reactive: the rows write into it
  ready: { type: Boolean, default: false },
  submit: { type: String, required: true },
});

defineEmits(["submit"]);

const tabs = [...new Set(props.rows.map(r => r.tab).filter(Boolean))];
const picked = ref(tabs[0]);
</script>

<template>
  <div v-if="tabs.length">
    <WinxTabs v-model="picked" :tabs="tabs.map(t => ({ key: t, text: t }))" />
  </div>
  <div v-for="t in tabs" :key="t" :hidden="t !== picked">
    <template v-for="(r, i) in rows" :key="i">
      <FormRow v-if="r.tab === t" :row="r" :values="values" />
    </template>
  </div>
  <template v-for="(r, i) in rows" :key="i">
    <FormRow v-if="!r.tab" :row="r" :values="values" />
  </template>
  <div class="modal-button-container">
    <button class="mod-cta" :disabled="!ready" @click="$emit('submit')">{{ submit }}</button>
  </div>
</template>
