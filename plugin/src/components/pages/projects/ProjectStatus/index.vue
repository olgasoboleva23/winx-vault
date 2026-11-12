<!-- A project's status pill: a dot in the status's colour, the word (idea / active / paused /
     done); in the list as it is, on a project's page inside the button that opens the menu -->
<script setup>
defineProps({ status: { type: String, required: true } });
</script>

<template>
  <span :class="['winx-project-status', `winx-project-status--${status}`]">{{
    `${status[0].toUpperCase()}${status.slice(1)}` }}</span>
</template>
