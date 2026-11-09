<!-- A table (block winx-table): `columns` [{ key, label, align?: "center", class?, tip? }] and
     `rows`; a column's tip is its header's tooltip (v-tip); bordered: a line between the columns;
     a cell shows row[col.key], or the `cell` slot ({ row, col, i }); `row-key` and `row-class`
     name a row. The look (index.scss): the rows parted by gold dashes, the header in Cinzel; a
     column's class goes on its header and cells -->
<script setup>
import { vTip } from "#/components/uikit/tooltip.js";

defineProps({
  columns: { type: Array, required: true },
  rows: { type: Array, required: true },
  rowKey: { type: Function, default: (row, i) => i },
  rowClass: { type: Function, default: () => null },
  bordered: { type: Boolean, default: false },   // a line between the columns
});
const cls = (part, col) =>
  [`winx-table__${part}`, { [`winx-table__${part}--center`]: col.align === "center" }, col.class];
</script>

<template>
  <table :class="['winx-table', { 'winx-table--bordered': bordered }]">
    <thead>
      <tr>
        <th
          v-for="col in columns"
          :key="col.key"
          v-tip="col.tip"
          :class="cls('head', col)"
        >{{ col.label }}</th>
      </tr>
    </thead>
    <tbody>
      <tr
        v-for="(row, i) in rows"
        :key="rowKey(row, i)"
        :class="['winx-table__row', rowClass(row)]"
      >
        <td
          v-for="col in columns"
          :key="col.key"
          :class="cls('cell', col)"
        >
          <slot
            name="cell"
            :row="row"
            :col="col"
            :i="i"
          >{{ row[col.key] }}</slot>
        </td>
      </tr>
    </tbody>
  </table>
</template>
