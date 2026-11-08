<!-- one field (WinxInput) and a submit button, a finger's height (block winx-add-form):
     v-model is the field's text, @submit the parent's save; input: the field's attributes
     ({ name, type, placeholder, … }) -->
<script setup>
import WinxInput from "#/components/uikit/WinxInput/index.vue";

defineProps({
  input: { type: Object, default: () => ({}) },
  submit: { type: String, default: "Add" },
});
defineEmits(["submit"]);
// a number field gives a number
const value = defineModel({ type: [String, Number], default: "" });
</script>

<template>
  <form class="winx-add-form winx-flex winx-gap-s" @submit.prevent="$emit('submit', value)">
    <WinxInput v-model="value" class="winx-add-form__input" v-bind="input" />
    <button class="winx-add-form__submit" type="submit">{{ submit }}</button>
  </form>
</template>
