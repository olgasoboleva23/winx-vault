<!-- a button that opens a note (a pill by default, as uikit/noteLink.js): from the note the
     block is in -->
<script setup>
import { inject } from "vue";
import { app } from "#/helpers/app.js";
import WinxButton from "./WinxButton/index.vue";

const props = defineProps({
  path: { type: String, required: true },
  kind: { type: String, default: "pill" },
});
const sourcePath = inject("sourcePath", "");
const open = () => app.workspace.openLinkText(props.path, sourcePath);
</script>

<template>
  <WinxButton :kind="kind" @click="open"><slot /></WinxButton>
</template>
