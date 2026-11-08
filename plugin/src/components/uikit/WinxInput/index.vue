<!-- A text field (block winx-input): v-model is its text (a number field gives a number). Its
     look is its kind: field (a finger's height on the pink paper: the weight's), inline (bare, in
     a table's row: a course's day note). Other attributes (name, @change…) go to the input -->
<script setup>
defineProps({
  kind: { type: String, default: "field" },   // field | inline
  type: { type: String, default: "text" },
  placeholder: { type: String, default: "" },
});
const value = defineModel({ type: [String, Number], default: "" });
</script>

<template>
  <input
    v-model="value"
    :class="['winx-input', `winx-input--${kind}`]"
    :type="type"
    :placeholder="placeholder"
  >
</template>
