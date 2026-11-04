<!-- one field and a submit button, a finger's height (block winx-add-form): v-model is the field's text, @submit
     the parent's save; input: the field's attributes ({ name, type, placeholder, … }) -->
<script setup>
defineProps({ input: { type: Object, default: () => ({}) }, submit: { type: String, default: "Add" } });
defineEmits(["submit"]);
const value = defineModel({ type: String, default: "" });
</script>

<template>
  <form class="winx-add-form" @submit.prevent="$emit('submit', value)">
    <input v-model="value" class="winx-add-form__input" v-bind="input">
    <button class="winx-add-form__submit" type="submit">{{ submit }}</button>
  </form>
</template>
