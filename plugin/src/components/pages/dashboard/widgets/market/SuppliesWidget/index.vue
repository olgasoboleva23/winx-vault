<!-- Supplies: by category, each with how long since the last time (or that it's listed) and
     "running low" -->
<script setup>
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";
import WinxGroupHeader from "#/components/uikit/WinxGroupHeader.vue";

defineProps({ state: { type: Object, required: true }, actions: { type: Object, required: true } });
</script>

<template>
  <div class="winx-supplies">
    <WinxEmpty v-if="state.data.empty" text="Nothing bought twice yet" />
    <template v-for="g in state.data.groups" :key="g.label">
      <WinxGroupHeader :label="g.label" />
      <div
        v-for="r in g.rows"
        :key="r.name"
        :class="['winx-supplies__row winx-row winx-gap-l', { 'winx-supplies__row--due': r.due }]"
      >
        <span class="winx-supplies__name winx-grow">{{ r.name }}</span>
        <span class="winx-supplies__info">{{ r.info }}</span>
        <WinxButton
          v-if="!r.listed"
          kind="pill"
          @click="actions.low(r.name, r.tag)"
        >running low</WinxButton>
      </div>
    </template>
  </div>
</template>
