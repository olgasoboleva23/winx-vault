<!-- A box with a mark (block winx-check): ☐ empty, ✅ purple with a tick (as Obsidian draws a done
     task), ❌ pink with a cross. A button that emits "tick" and plays the mark's sound
     (helpers/sounds.js: a gem for ✅, the slowed gem back to ☐, a chime for ❌); `static`: a plain
     box, for a legend or inside another button; `size` s: a small one -->
<script setup>
import { playMark } from "#/helpers/sounds.js";

const props = defineProps({
  mark: { type: String, default: "☐" },   // ☐ | ✅ | ❌
  size: { type: String, default: "m" },   // m | s
  static: { type: Boolean, default: false },
  sound: { type: Boolean, default: true },
});
const emit = defineEmits(["tick"]);
const KIND = { "☐": "off", "✅": "on", "❌": "no" };
const tick = () => {
  emit("tick");
  if (props.sound) playMark(props.mark);
};
</script>

<template>
  <span
    v-if="static"
    :class="['winx-check', `winx-check--${KIND[mark]}`, `winx-check--${size}`]"
    :data-mark="mark"
  />
  <button
    v-else
    type="button"
    :class="['winx-check', 'winx-check--btn', `winx-check--${KIND[mark]}`, `winx-check--${size}`]"
    :data-mark="mark"
    @click="tick"
  />
</template>
