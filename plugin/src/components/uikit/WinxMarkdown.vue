<!-- Markdown text (block winx-markdown) drawn by Obsidian's own renderer: links, bold, lists as in
     a note; it draws again when `text` changes;
     sourcePath: the note that relative links resolve from -->
<script setup>
import { Component, MarkdownRenderer } from "obsidian";
import { onBeforeUnmount, onMounted, ref, watch } from "vue";
import { app } from "#/helpers/app.js";

const props = defineProps({
  text: { type: String, default: "" },
  sourcePath: { type: String, default: "" },
});
const el = ref(null);
let owner = null;   // the renderer's Obsidian component: a new one per draw, the old one let go
let latest = 0;     // the newest draw's number: an older, slower one is dropped

async function draw() {
  const mine = ++latest;
  const next = new Component();
  const box = document.createElement("div");

  next.load();
  await MarkdownRenderer.render(app, props.text, box, props.sourcePath, next);
  if (mine !== latest || !el.value) return next.unload();

  owner?.unload();
  owner = next;
  el.value.replaceChildren(...box.childNodes);
}

onMounted(draw);
onBeforeUnmount(() => {
  latest++;
  owner?.unload();
});
watch(() => [props.text, props.sourcePath], draw);
</script>

<template>
  <div ref="el" class="winx-markdown" />
</template>
