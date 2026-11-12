<!-- Markdown text (block winx-markdown) drawn by Obsidian's own renderer: links, bold, lists as in
     a note; it draws again when `text` changes -->
<script setup>
import { Component, MarkdownRenderer } from "obsidian";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";

const props = defineProps({ text: { type: String, default: "" } });
const el = ref(null);
const owner = new Component();

async function draw() {
  el.value.empty?.();
  el.value.textContent = "";
  await MarkdownRenderer.render(globalThis.app, props.text, el.value, "", owner);
}

onMounted(() => {
  owner.load();
  draw();
});
onBeforeUnmount(() => owner.unload());
watch(() => props.text, draw);
</script>

<template>
  <div ref="el" class="winx-markdown" />
</template>
