<!-- The Medication page (Medication.md's ```winx meds block): a tab per course of courses.json
     (running first, then the newest start), the picked one below it (MedsCourse); no course yet:
     how to make one -->
<script setup>
import { computed, ref } from "vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";
import WinxTabs from "#/components/uikit/WinxTabs/index.vue";
import MedsCourse from "./MedsCourse/index.vue";

const props = defineProps({ state: { type: Object, required: true } });
const list = computed(() => props.state.data.list);
// the tab picked; the first one until then, or when the picked course is gone
const chosen = ref(null);
const picked = computed({
  get: () => (list.value.some(c => c.id === chosen.value) ? chosen.value : list.value[0]?.id),
  set: id => { chosen.value = id; },
});
</script>

<template>
  <WinxEmpty v-if="!list.length" text="No courses yet: Winx: New medication course" />
  <div v-else>
    <!-- one row, sideways scroll (Helga, pending: drop "scroll" to wrap) -->
    <WinxTabs
      v-model="picked"
      :tabs="list.map(c => ({ key: c.id, text: c.label }))"
      scroll
    />
    <MedsCourse
      :id="picked"
      :course="state.data.data[picked]"
      :notes="state.data.notes[picked]"
      :intake="state.data.intake[picked]"
    />
  </div>
</template>
