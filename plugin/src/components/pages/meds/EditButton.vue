<!-- the ✎ by the course card's title: the course edited in its window -->
<script setup>
import { inject } from "vue";
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import { editCourse } from "#/controllers/meds.js";

const sourcePath = inject("sourcePath");
</script>

<template>
  <WinxButton
    kind="text"
    title="edit course"
    class="winx-widget__add"
    @click="editCourse(sourcePath)"
  >✎</WinxButton>
</template>
