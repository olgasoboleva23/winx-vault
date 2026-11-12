[← Docs](index.md)

# 🛠 Development

## 🗂 Structure

```
├── 📁 plugin — the Winx plugin
│   ├── 📁 src
│   │   ├── main.ts               — loads everything: the ```winx block, the dashboard and calendar tabs, ✨,
│   │   │                           the commands
│   │   ├── 📁 components         — every .vue (a styled one: a folder with index.vue and its index.scss)
│   │   │   ├── 📁 uikit          — the shared parts: WinxButton (round, nav, pill, chip, toggle, text),
│   │   │   │                       WinxCard, WinxChart, WinxTable, WinxInput, WinxCheckbox, WinxNoteLink,
│   │   │   │                       WinxEmpty / WinxMissing / WinxFailed, tooltip.js (the v-tip directive),
│   │   │   │                       WinxGroupHeader, WinxAddForm; Obsidian's windows: Form, Search,
│   │   │   │                       TaskWindow (a task's difficulty, area, time, sticker, variants), TaskSearch
│   │   │   └── 📁 pages
│   │   │       ├── 📁 dashboard  — view.ts (the tab: its date, the ✦ pill), layout.md (its cards),
│   │   │       │                   DashboardDate.vue (the date row), index.scss; widgets/<topic>/ (each
│   │   │       │                   widget's markup and styles)
│   │   │       ├── 📁 calendar   — view.ts (the tab: its state, the model, the listeners), CalendarTab,
│   │   │       │                   CalendarHeader, CalendarMissed, CalendarGrid, CalendarPanel, the days
│   │   │       │                   and the tasks (TaskRow, TaskCard…)
│   │   │       └── 📁 finance, shop, supplies, meds — the pages on notes of their own: a note's
│   │   │                           ```winx block (meds: a page drawn from `courses.json`: tabs per course, Приём, Заметки, the grid)
│   │   ├── 📁 controllers        — per topic, what a widget shows (its load) and what it writes (weight,
│   │   │                           cycle, savings, shop, market, finance, goals, xp, pomodoro, dailyNote),
│   │   │                           tasks.js (a task's line with undo, new tasks and pool lines),
│   │   │                           calendar.js (what the calendar writes), notes.js, mobileConfig.js,
│   │   │                           blocks.js (the ```winx block: names → { view, load, watches })
│   │   ├── 📁 models             — the things and their rules, no Obsidian in them: lineItem (a log's line
│   │   │                           and its JSON record by id), Task (with its variants in turn), Note, Goal,
│   │   │                           SavingsJar, the weight / body / cycle logs, CalendarData, repeats (🔁
│   │   │                           rules), ledger (finance), timer (pomodoro), vitals (HP / MP), xp, market
│   │   │                           (MarketItem, the categories, supply stats), kinds (watch / read / game /
│   │   │                           recipe notes), taskFile (a task note's lines as tasks and pool lines)
│   │   ├── 📁 migrations         — tasks.js, market.js, meds.js, food.js: the one-off migrations (Winx: Migrate tasks /
│   │   │                           market / medication / food; install the new build on both devices first, then
│   │   │                           migrate medication, then food, on the desktop)
│   │   ├── 📁 composables        — use.js (useRedraw, useDataviewChanges, useWhenIndexed, useNewDay,
│   │   │                           useBusy, useLater…), vueApp.ts (useVueApp: a Vue app owned by an Obsidian
│   │   │                           component), vueHost.ts (VueHost: a widget's), drag.js / swipe.js (the
│   │   │                           calendar's), notify.js (desktop reminders)
│   │   ├── 📁 store              — tasks.js (the tasks of 00 System/Data/Tasks, read by the plugin itself and
│   │   │                           kept up to date on Obsidian's own file events: no Dataview, no wait for its
│   │   │                           index), calendar.js (the calendar tab's state: its saved and data keys)
│   │   ├── 📁 helpers            — paths (where the data lives), app, dates, files (edit / editLine /
│   │   │                           appendLine), config, format (money, amount), sounds, chart, plugins
│   │   │                           (Dataview, Tasks, blockDv), find, parse (a block's lines), panelGroups
│   │   ├── 📁 styles             — main.scss (every block in cascade order) and the shared look: tokens,
│   │   │                           mixins ($space-*, $text-*, $radius-*, $btn-*, row / center), fonts,
│   │   │                           layout, the cards' grid, nav, busy, syncing, helpers (.winx-is-*)
│   │   └── 📁 commands           — commands.ts (the Cmd+P commands, the Alt+T menu)
│   └── 📁 tests                  — npm test; tests/obsidian/ checks styles inside Obsidian
├── 📁 00 System
│   ├── 📁 Assets                 — sounds, task stickers (stickers/)
│   └── 📁 Data                   — everything Winx reads and writes (paths: plugin/src/helpers/paths.js):
│                                   Tasks/ (Master.md: the lines, tasks.json: Winx's fields by id), Goals.md, Finance/ (Ledger/, rules.json),
│                                   Shop.md, Celestial Market.md (the log; Market/items.json: the items by id;
│                                   Celestial Market (old).md: the copy before the migration), Supplies.md, Cycle.md, Weight.md, Body log.md, Savings/
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

After a rebuild run **Winx: Reload** (Cmd+P) (the open notes redraw their widgets). `npm run build` makes `plugin/dist/` (`main.js`, `styles.css`, `manifest.json`); a Sass error fails it.

`tests/obsidian/styles-snapshot.js` records the computed styles of every element on a set of pages (run it inside Obsidian); `compare-snapshots.mjs` diffs two such records, to check a style change moved nothing it shouldn't.

## A widget

A widget is a `.vue` file for its markup (`components/pages/dashboard/widgets/`; a page on a note of its own: `components/pages/<page>/`) and its controller
(`controllers/<topic>.js`: what it loads and what it writes), registered by name in
`plugin/src/controllers/blocks.js`:

```js
// controllers/weight.js
export async function loadWeight({ dv, app, args }) { … }     // what it shows (dv: Dataview for the block's note)
export async function logWeight(typed) { … }                  // what it writes: the .vue imports it
// blocks.js
weight: { view: WeightCard, load: loadWeight, watches: [WEIGHT, BODY_LOG, CYCLE] },
```

```vue
<!-- components/pages/dashboard/widgets/weight/index.vue -->
<script setup>
import { logWeight } from "#/controllers/widgets/weight.js";

defineProps({ state: { type: Object, required: true } });
</script>

<template>
  <div class="winx-weight">
    <span class="winx-weight__now">{{ state.data.weight.last.kg }} kg</span>
    <WinxNoteLink path="00 System/Data/Weight.md">✦ list</WinxNoteLink>
  </div>
</template>
```

- A `VueHost` (`plugin/src/composables/vueHost.ts`) owns each block's Vue app: it loads the data now and again when
  a file it names (`watches`) changes: the task files at once, from the plugin's own store, the rest a moment
  after Dataview's index has them (or the block's own note changes; a hidden block when it shows), drops a stale result,
  shows an error with retry, a card's placeholder until the first data, and the card itself (`card:` in the
  block). `follows: false` loads once (the pomodoro); `cardButton` puts a button by the card's title. The view
  gets `state` as its prop; a widget that must load again after its own write (the shop's balance) takes
  `retry` by `inject("retry")`.
- The parts in `plugin/src/components/uikit/` are reusable: `WinxButton` with a kind (`round`, `nav`, `pill`, `chip`,
  `toggle`, `text`) and its tooltip (`title`; `tip="pink"` on a blue place), `WinxCard`, `WinxChart` (a Charts
  plugin chart, destroyed with it), `WinxTable` (columns with a key, label, align, class and tip; rows; a cell
  slot; a row's key and class), `WinxInput` (a text field: `field`, or `inline` in a table's row), `WinxCheckbox`
  (a box with a mark ☐ / ✅ / ❌ and its sound; `static` for a legend), `WinxEmpty` / `WinxMissing` /
  `WinxFailed`, `WinxNoteLink`, `WinxGroupHeader`, `WinxAddForm`.
- A hint on hover is the `v-tip` directive (`uikit/tooltip.js`), not a component: it asks Obsidian for its tooltip
  (`setTooltip`), which is drawn on the body, so a card's edge or a table's scroll never clips it, and it goes
  on any element (a `th`, a `div`, a button) without a wrapper in the DOM. `v-tip="text"`, `v-tip:bottom`,
  `v-tip.pink` on a blue place (Missed, today); the look is `styles/_tooltip.scss` (`.tooltip.winx-tooltip`).
  No `title` attributes: a button's `title` prop becomes its tooltip and `aria-label`.
- The data comes ready from `load` (labels, sums, dates); the template has values, `v-for` with a `:key` and
  `v-if`. A click is `@click` calling an action; what a card only shows (a mode, a fold, a picked level) is the
  component's own state.
- Class names are BEM: `winx-block__element--modifier` (`winx-weight__now`, `winx-cal__day--today`, `winx-btn--on`), one block per `index.scss` next to its component (shared ones in `plugin/src/styles/`); states the code sets are modifiers; global helpers are `.winx-is-*` in `plugin/src/styles/_helpers.scss`.
- A note shows a widget with a `winx` block (see [Dashboard](dashboard.md)).

## The calendar

The calendar tab is an ItemView (`plugin/src/components/pages/calendar/view.ts`) that mounts
`CalendarTab`: its state (date, view, tab, folds; `store/calendar.js`) is Vue's `reactive`, saved
with the layout; the model (`models/calendarData.js`) is recomputed
when the date, the view or a filter changes, or when a task file does (`store/tasks.js` reads it again as soon as
it's saved; the calendar needs no Dataview); the parts (`CalendarHeader`,
`CalendarMissed`, `CalendarGrid`, `CalendarPanel`) and the tasks (`TaskRow`, `TaskCard`…) are `.vue` files.
Elements carry the task's key (`data-task`: file, line, status, words), the `:key` Vue keeps them by, and what
the tab's drag (`data-drag` → `data-drop`) and swipe (`data-swipeable`) listeners
(`composables/drag.js`, `swipe.js`) find the task by.

