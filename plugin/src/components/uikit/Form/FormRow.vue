<!-- A row of the Form window (the shapes: Form/index.ts): Obsidian's setting row, its name and
     its control; `bare`: the control alone (a list's cell). A list row: its groups, each its rows
     again, a × each and a + under them (fixed: neither). Rows of text boxes, checkboxes and labels
     only: one grid (--winx-form-cols), a line of the rows' names (a checkbox's description as its
     name's tooltip), then a line a group; a text box's column shares the width, the others fit
     what's in them. Other rows: the groups stacked. A list named as its tab has no heading -->
<script setup>
/* eslint-disable vue/no-mutating-props -- `values` is the window's one reactive object (or a
   list group's in it): every row writes its own key there, Form/index.ts resolves to it */
import { computed, inject } from "vue";

const props = defineProps({
  row: { type: Object, required: true },
  values: { type: Object, required: true },
  bare: { type: Boolean, default: false },
});
const resourcePath = inject("resourcePath");
const { row } = props;   // a row never changes; its values do (a group taken off: the next one's)
const list = "list" in row;

if (list) {
  props.values[row.key] ??= [];
  if (!row.fixed && !props.values[row.key].length) props.values[row.key].push({});
}

const groups = computed(() => list ? props.values[row.key] : []);
const lines = list
  && row.list.every(s => ("text" in s && !s.lines) || "check" in s || "label" in s);
const cols = list && row.list.map(s => "text" in s && !s.color ? "minmax(0, 1fr)" : "auto")
  .concat(row.fixed ? [] : "auto").join(" ");
const narrow = s => "check" in s || !!s.color;
const choices = computed(() =>
  typeof row.options === "function" ? row.options(props.values) : row.options);
// a text box: a number is a Number ("" null), a text trimmed (v-model.trim), lines as typed
const model = computed({
  get: () => props.values[row.key] ?? "",
  set: v => { props.values[row.key] = row.number ? (v === "" ? null : Number(v)) : v; },
});
</script>

<template>
  <template v-if="list">
    <div v-if="row.name !== row.tab" class="setting-item">
      <div class="setting-item-info"><div class="setting-item-name">{{ row.name }}</div></div>
    </div>
    <div
      v-if="lines"
      class="winx-form__list winx-form__list--lines"
      :style="{ '--winx-form-cols': cols }"
    >
      <div v-if="groups.length" class="winx-form__line winx-form__line--head">
        <div
          v-for="(s, i) in row.list"
          :key="i"
          :class="['winx-form__cell', { 'winx-form__cell--narrow': narrow(s) }]"
          :title="s.check"
        >{{ s.name }}</div>
        <div v-if="!row.fixed" class="winx-form__cell winx-form__cell--narrow" />
      </div>
      <div v-for="(g, n) in groups" :key="n" class="winx-form__line">
        <div
          v-for="(s, i) in row.list"
          :key="i"
          :class="['winx-form__cell', { 'winx-form__cell--narrow': narrow(s) }]"
        ><FormRow :row="s" :values="g" bare /></div>
        <div v-if="!row.fixed" class="winx-form__cell winx-form__cell--narrow">
          <button title="Remove" @click="groups.splice(n, 1)">×</button>
        </div>
      </div>
    </div>
    <div v-else class="winx-form__list">
      <div v-for="(g, n) in groups" :key="n" class="winx-form__group">
        <FormRow
          v-for="(s, i) in row.list"
          :key="i"
          :row="s"
          :values="g"
        />
        <button v-if="!row.fixed" title="Remove" @click="groups.splice(n, 1)">×</button>
      </div>
    </div>
    <div v-if="!row.fixed" class="winx-form__more">
      <button title="One more" @click="groups.push({})">+</button>
    </div>
  </template>
  <div v-else-if="!bare" class="setting-item">
    <!-- a long name wraps (the field stays in the window), but many buttons never squeeze it -->
    <div class="setting-item-info winx-form__info">
      <div class="setting-item-name">{{ row.name }}</div>
      <div v-if="'check' in row" class="setting-item-description">{{ row.check }}</div>
    </div>
    <div class="setting-item-control winx-form__control">
      <FormRow :row="row" :values="values" bare />
    </div>
  </div>
  <template v-else-if="'options' in row">
    <button
      v-for="(c, i) in choices"
      :key="i"
      :class="{ 'mod-cta': c.value === values[row.key] }"
      :title="c.label"
      @click="values[row.key] = c.value"
    >
      <img v-if="c.img" class="winx-form__img" :src="resourcePath(c.img)">
      <template v-else>{{ c.label }}</template>
    </button>
  </template>
  <span v-else-if="'label' in row" class="winx-form__label">{{ values[row.key] ?? "" }}</span>
  <input
    v-else-if="'check' in row"
    type="checkbox"
    :checked="!!values[row.key]"
    @change="values[row.key] = $event.target.checked"
  >
  <textarea
    v-else-if="row.lines"
    v-model="model"
    class="winx-form__textarea"
    :placeholder="row.text"
    rows="4"
  />
  <!-- a text box fills a list's cell; a colour keeps its own size -->
  <input
    v-else
    v-model.trim="model"
    :type="row.number ? 'number' : row.color ? 'color' : 'text'"
    :class="{ 'winx-form__input': !row.color }"
    :placeholder="row.text"
    :readonly="row.readonly?.(values) ?? false"
  >
</template>
