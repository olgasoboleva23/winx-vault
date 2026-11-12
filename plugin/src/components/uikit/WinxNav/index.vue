<!-- The Winx tab's nav (block winx-rail): a WinxButton kind rail per item ({ key, icon, text }),
     the current one on; a click says which (go(key, event)). Desktop: a short pill at the left edge
     over the page, opened by hover or focus (labels shown), shut by a click until the pointer
     leaves; phone: the bottom bar, an icon above a small label -->
<script setup>
import { ref } from "vue";
import WinxButton from "#/components/uikit/WinxButton/index.vue";

const props = defineProps({
  items: { type: Array, required: true },
  current: { type: String, default: null },
  phone: { type: Boolean, default: false },
  expanded: { type: String, default: null },   // the item whose drawer is open: aria-expanded
});
const emit = defineEmits(["go"]);

const hover = ref(false), shut = ref(false);   // under the pointer; shut by a click until it leaves

const enter = () => { hover.value = !props.phone; };

const leave = () => { hover.value = false; shut.value = false; };

function go(key, event) {
  shut.value = !props.phone;
  emit("go", key, event);
}
</script>

<template>
  <nav
    :class="[
      'winx-rail',
      { 'winx-rail--phone': phone, 'winx-rail--open': hover && !shut, 'winx-rail--shut': shut },
    ]"
    @pointerenter="enter"
    @pointerleave="leave"
  >
    <WinxButton
      v-for="i in items"
      :key="i.key"
      kind="rail"
      class="winx-rail__item"
      :on="i.key === current"
      :aria-current="i.key === current ? 'page' : null"
      :aria-expanded="i.key === expanded ? 'true' : null"
      :title="i.text"
      @click="go(i.key, $event)"
    >
      <span class="winx-rail__icon">{{ i.icon }}</span>
      <span class="winx-rail__label">{{ i.text }}</span>
    </WinxButton>
  </nav>
</template>
