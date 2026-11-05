<!-- the ＋ by Celestial Market's card title: a new item from the search -->
<script setup>
import WinxButton from "../../../../uikit/WinxButton/index.vue";

defineProps({ actions: { type: Object, required: true } });
</script>

<template>
  <WinxButton
    kind="text"
    title="add item"
    class="winx-widget__add"
    @click="actions.add()"
  >+</WinxButton>
</template>
