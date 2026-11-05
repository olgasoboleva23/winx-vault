[← Docs](index.md)

# 🛠 Development

## 🗂 Structure

```
├── 📁 plugin — the Winx plugin
│   ├── 📁 src
│   │   ├── main.ts               — loads everything; the ```winx block, the dashboard and calendar tabs, ✨, the commands
│   │   ├── 📁 components         — every .vue: uikit/ (the shared parts: WinxButton (round, nav, pill, chip, toggle,
│   │   │                           text), WinxCard, WinxChart, WinxNoteLink, WinxEmpty / WinxMissing / WinxFailed,
│   │   │                           WinxGroupHeader, WinxAddForm), widgets/<topic>/ (a widget's markup), calendar/
│   │   │                           (CalendarTab and its parts and tasks), dashboard/ (DashboardDate: the date row)
│   │   ├── 📁 calendar           — the calendar tab: view.ts (an ItemView: the state, saved with the layout; the model;
│   │   │                           the listeners) mounting components/calendar/CalendarTab.vue; data.js (CalendarData,
│   │   │                           the model, taskInfo), state.js (the saved and data keys), drag.js / swipe.js (the
│   │   │                           tab's drag and swipe listeners)
│   │   ├── 📁 dashboard          — the dashboard tab: view.ts (its date, the ✦ pill), layout.md (its cards)
│   │   ├── 📁 commands           — commands.ts (the Cmd+P commands, the Alt+T menu)
│   │   ├── 📁 controllers        — what changes the models and writes them: tasks.js (a task's line rewritten with
│   │   │                           undo, deleted, the task window, the Tasks dialog; a new task, a new pool line),
│   │   │                           calendar.js (the calendar's writes), shop.js (a purchase), market.js (an item
│   │   │                           added through the search, bought, back on the list), savings.js, cycle.js,
│   │   │                           weight.js, dailyNote.js, pomodoro.js (the widgets' actions), notes.js (a new
│   │   │                           note of a kind)
│   │   ├── 📁 models             — the things themselves, as classes, no Obsidian in them: task.js (Task: one task
│   │   │                           line, what it is and how to change it), note.js (Note: a new note from data),
│   │   │                           goal.js, marketItem.js, savingsJar.js (and the paydays), weightLog.js,
│   │   │                           bodyLog.js, cycleLog.js
│   │   ├── 📁 notes              — kinds.js (watch / read / game / recipe / work task: their windows and notes)
│   │   ├── 📁 services           — no markup: notify.js (desktop reminders), mobileConfig.js (obsidian-mobile/ → .obsidian-mobile)
│   │   ├── 📁 core               — paths.js (where the data lives), app.js (Obsidian's app for modules), vueHost.ts
│   │   │                           (VueHost: a Vue app owned by an Obsidian component), dates, files (edit / editLine,
│   │   │                           only while the line is the same / appendLine a note), config, format (money, amount),
│   │   │                           sounds (and 🔇), chart.js, plugins.js (Dataview, Tasks, blockDv), use.js
│   │   │                           (composables: useRedraw, useDataviewChanges, useWhenIndexed, useNewDay, useBusy…)
│   │   ├── 📁 tasks              — repeats.js (🔁 rules), taskSearch.js (New task: a past task)
│   │   ├── 📁 uikit              — Obsidian's windows: Form (one window of fields), Search (a search window over a list)
│   │   └── 📁 widgets            — blocks.js (names → { view, load, actions }); per widget its load (the reads)
│   │                               in a .js (its markup: components/widgets/, its writes: controllers/); a topic's own
│   │                               reads next to them: market/ (the list, the supplies), xp/ (HP / MP: vitals.js),
│   │                               shop/ (gold), finance/ (ledger.js: rows, totals, the report), pomodoro/ (timer.js:
│   │                               the clock)
│   ├── 📁 styles                 — Sass partials, built into the plugin's styles.css; uikit/ the parts' looks;
│   │                               _mixins.scss has the shared sizes ($space-*, $text-*, $radius-*, $btn-*, $deco, $tap …) and the row / center mixins
│   └── 📁 tests                  — npm test; tests/obsidian/ checks styles inside Obsidian
├── 📁 00 System
│   ├── 📁 Assets                 — sounds, task stickers (stickers/)
│   └── 📁 Data                   — everything Winx reads and writes (paths: plugin/src/core/paths.js):
│                                   Tasks/ (Master.md: all tasks, Pool.md), Goals.md, Finance/ (Ledger/, rules.json),
│                                   Shop.md, Celestial Market.md, Supplies.md, Cycle.md, Weight.md, Body log.md, Savings/
├── 📁 02 Areas/Personal/Daily Notes — daily notes (the folder set in Obsidian's Daily notes)
├── 📁 03 Resources/Collections   — Readlist, Gamelist, Watchlist, Recipes (Obsidian Bases)
```

## Build and test

```sh
cd plugin
npm ci
npm test                                   # unit tests
npm run check                              # types (vue-tsc: .ts, .js and .vue)
npm run lint                               # ESLint with Obsidian's rules (eslint-plugin-obsidianmd), lines ≤ 100,
                                           # blank lines between blocks; Stylelint (standard SCSS, BEM names)
WINX_VAULT=/path/to/your/vault npm run dev # build into <vault>/.obsidian/plugins/winx on every save
```

After a rebuild run **Winx: Reload** (Cmd+P) and reopen the open notes (widgets already drawn keep the old code). `npm run build` makes `plugin/dist/` (`main.js`, `styles.css`, `manifest.json`); a Sass error fails it.

`tests/obsidian/styles-snapshot.js` records the computed styles of every element on a set of pages (run it inside Obsidian); `compare-snapshots.mjs` diffs two such records, to check a style change moved nothing it shouldn't.

## A widget

A widget is a `.vue` file for its markup, a function that loads its data (`widgets/`) and its writes
(`controllers/`), registered by name in `plugin/src/widgets/blocks.js`:

```js
// widgets/body/weight.js
export async function loadWeight({ dv, app, args }) { … }     // what it shows (dv: Dataview for the block's note)
// controllers/weight.js
export const weightActions = () => ({ logWeight: async typed => { … }, logBody: … });
// blocks.js
weight: { view: WeightCard, load: loadWeight, actions: weightActions },
```

```vue
<!-- WeightCard.vue -->
<script setup>
defineProps({ state: { type: Object, required: true }, actions: { type: Object, required: true } });
</script>

<template>
  <div class="winx-weight">
    <span class="winx-weight__now">{{ state.data.weight.last.kg }} kg</span>
    <WinxNoteLink path="00 System/Data/Weight.md">✦ list</WinxNoteLink>
  </div>
</template>
```

- A `VueHost` (`plugin/src/core/vueHost.ts`) owns each block's Vue app: it loads the data now and again a moment
  after Dataview's index or the block's own note changes (a hidden block when it shows), drops a stale result,
  shows an error with retry, a card's placeholder until the first data, and the card itself (`card:` in the
  block). `follows: false` loads once (the pomodoro); `cardButton` puts a button by the card's title.
- The parts in `plugin/src/components/uikit/` are reusable: `WinxButton` with a kind (`round`, `nav`, `pill`, `chip`,
  `toggle`, `text`), `WinxCard`, `WinxChart` (a Charts plugin chart, destroyed with it), `WinxEmpty` /
  `WinxMissing` / `WinxFailed`, `WinxNoteLink`, `WinxGroupHeader`, `WinxAddForm`.
- The data comes ready from `load` (labels, sums, dates); the template has values, `v-for` with a `:key` and
  `v-if`. A click is `@click` calling an action; what a card only shows (a mode, a fold, a picked level) is the
  component's own state.
- Class names are BEM: `winx-block__element--modifier` (`winx-weight__now`, `winx-cal__day--today`, `winx-btn--on`), one block per file in `plugin/styles/widgets/` or `plugin/styles/uikit/`; states the code sets are modifiers; global helpers are `.winx-is-*` in `plugin/styles/_helpers.scss`.
- A note shows a widget with a `winx` block (see [Dashboard](dashboard.md)).

## The calendar

The calendar tab is an ItemView (`plugin/src/calendar/view.ts`) that mounts `components/calendar/CalendarTab.vue`: its state (date,
view, tab, folds) is Vue's `reactive`, saved with the layout; the model (`CalendarData`, `data.js`) is recomputed
when the date, the view or a filter changes, or when Dataview has a change; the parts (`CalendarHeader`,
`CalendarMissed`, `CalendarGrid`, `CalendarPanel`) and the tasks (`TaskRow`, `TaskCard`…) are `.vue` files.
Elements carry the task's key (`data-task`: file, line, status, words), the `:key` Vue keeps them by, and what
the tab's drag (`data-drag` → `data-drop`) and swipe (`data-swipeable`) listeners find the task by.

