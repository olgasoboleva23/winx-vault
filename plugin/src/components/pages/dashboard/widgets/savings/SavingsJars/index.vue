<!-- Savings: a jar per goal (its picture greyed above what's saved, the bar, a ✦ stamp per
     deposit), the payday's "put in" with ✓ done until the deposit is in, the next paydays -->
<script setup>
import WinxButton from "#/components/uikit/WinxButton/index.vue";
import WinxEmpty from "#/components/uikit/WinxEmpty/index.vue";

defineProps({ state: { type: Object, required: true }, actions: { type: Object, required: true } });
</script>

<template>
  <WinxEmpty v-if="!state.data.jars.length" :text="state.data.empty" />
  <div v-else class="winx-savings">
    <div v-for="j in state.data.jars" :key="j.path" class="winx-jar">
      <div class="winx-jar__goal winx-row winx-gap-xl">
        <div class="winx-jar__pic">
          <template v-if="j.img">
            <img class="winx-jar__img" :src="j.img" alt="">
            <img
              class="winx-jar__img winx-jar__img--grey"
              :src="j.img"
              alt=""
              :style="j.greyed"
            >
          </template>
        </div>
        <div>
          <div class="winx-jar__name">✦ {{ j.name }}</div>
          <div class="winx-jar__big">{{ j.big }}</div>
          <div class="winx-jar__note">{{ j.note }}</div>
        </div>
      </div>
      <div v-if="j.fill !== null" class="winx-jar__bar">
        <i class="winx-jar__fill" :style="`width: ${j.fill}%`" />
      </div>
      <div class="winx-jar__stamps winx-flex winx-wrap winx-gap-s">
        <span
          v-for="(on, i) in j.stamps"
          :key="i"
          :class="['winx-jar__stamp winx-center', { 'winx-jar__stamp--on': on }]"
        >✦</span>
      </div>
      <div v-if="j.due" class="winx-jar__due winx-row winx-between winx-gap-m">
        <span>{{ j.due.when }}: <b class="winx-jar__due-sum">put in {{ j.due.sum }}</b></span>
        <WinxButton kind="pill" @click="actions.deposit(j.path)">✓ done</WinxButton>
      </div>
      <div class="winx-jar__next winx-text-center">next payday: {{ j.next }}</div>
    </div>
  </div>
</template>
