[← Docs](index.md)

# 🛠 Development

## 🗂 Structure

```
├── 📁 plugin — the Winx plugin
│   ├── 📁 src
│   │   ├── main.ts               — loads everything; the ```winx block, the dashboard and calendar tabs, ✨, the commands
│   │   ├── 📁 calendar           — the calendar tab: view.ts (the store, the listeners, draw), parts/ (part.js, header.js,
│   │   │                           missed.js, grid.js, panel.js), layout.js (the parts in order, one redrawn in place),
│   │   │                           components.js (TaskText, TaskRow, TaskCard), taskButtons.js (✏️ 🗑 ⏭ ✓), data.js
│   │   │                           (CalendarData, the model, taskInfo) and state.js (the tab's state: saved and data keys),
│   │   │                           actions.js (what it writes), drag.js / swipe.js (useDrag, useSwipe)
│   │   ├── 📁 dashboard          — the dashboard tab: view.ts (its date, the ✦ pill), layout.md (its cards)
│   │   ├── 📁 commands           — commands.ts (the Cmd+P commands, the Alt+T menu)
│   │   ├── 📁 notes              — note.js (Note: a new note from data), kinds.js (watch / read / game / recipe / work task)
│   │   ├── 📁 services           — no markup: notify.js (desktop reminders), mobileConfig.js (obsidian-mobile/ → .obsidian-mobile)
│   │   ├── 📁 core               — paths.js (where the data lives), app.js (Obsidian's app for modules), store.js
│   │   │                           (createStore: a tab's state, set / watch), dates,
│   │   │                           files (edit / editLine / appendLine a note), config, sounds (and 🔇),
│   │   │                           html.js (markup in backticks), chart.js, use.js (composables: useActions, useRedraw,
│   │   │                           useDataviewChanges, useWhenIndexed, useNewDay, useBusy, useWindowBack, useNoteLinks…)
│   │   ├── 📁 tasks              — task.js (one task line: what it is, how to change it), repeats.js (🔁 rules),
│   │   │                           taskEdit.js (rewrite a line with undo, the task window), taskSearch.js (New task: a past task)
│   │   ├── 📁 uikit              — the interface parts, props in, markup out: Button (round, nav, pill, chip, toggle,
│   │   │                           text), Card, NoteLink, Empty / Missing, GroupHeader, AddForm; Form (one window of
│   │   │                           fields), Search (a search window over a list), busy.js (the ✦ pill)
│   │   └── 📁 widgets            — widget.js (the base class), blocks.js (names → classes), one class per widget;
│   │                               a topic's own logic next to its widgets, as classes: market/ (MarketItem, the search),
│   │                               goals/ (Goal), body/ (CycleLog, WeightLog, BodyLog), savings/ (SavingsJar, paydays), xp/ (HP / MP: vitals.js), shop/ (gold),
│   │                               finance/ (ledger.js: rows, totals, the report), pomodoro/ (timer.js: the clock)
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
npm run check                              # types (tsc)
npm run lint                               # ESLint with Obsidian's rules (eslint-plugin-obsidianmd)
WINX_VAULT=/path/to/your/vault npm run dev # build into <vault>/.obsidian/plugins/winx on every save
```

After a rebuild run **Winx: Reload** (Cmd+P) and reopen the open notes (widgets already drawn keep the old code). `npm run build` makes `plugin/dist/` (`main.js`, `styles.css`, `manifest.json`); a Sass error fails it.

`tests/obsidian/styles-snapshot.js` records the computed styles of every element on a set of pages (run it inside Obsidian); `compare-snapshots.mjs` diffs two such records, to check a style change moved nothing it shouldn't.

## A widget

Each widget is a class on `Widget` (`plugin/src/widgets/widget.js`), with the same parts:

```js
export class Weight extends Widget {
  on = { save: async (e, form) => { … }, list: () => { … } };   // what data-action="save" / "list" do
  async data() { … }                                             // what it shows (this.dv: Dataview, this.args: the block's lines)
  view(d) {                                                      // its markup, in backticks
    return html`<div class="winx-weight">
      <span class="winx-weight__now">${d.last.kg} kg</span>
      ${new Button({ text: "✦ list", action: "list", kind: "pill" })}
    </div>`;
  }
  after(root, d) { this.keep(chart) }                            // what markup can't do (a chart)
}
```

- `html` escapes every value put in (a task with `<` or `&` can't break the markup); a nested `html` or a `Component` goes in as it is.
- `Button`, `Card` and the other parts in `plugin/src/uikit/` are reusable: a button with a kind (`round`, `nav`, `pill`, `chip`, `toggle`, `text`), an action and `data-*` values; a dashboard card with a title and the widget inside.
- Class names are BEM: `winx-block__element--modifier` (`winx-weight__now`, `winx-cal__day--today`, `winx-btn--on`), one block per file in `plugin/styles/widgets/` or `plugin/styles/uikit/`; states the code sets are modifiers; global helpers are `.winx-is-*` in `plugin/styles/_helpers.scss`.
- A click on an element with `data-action="name"` (a change for an input, a submit for a form) calls `on.name`.
- The base draws the widget, and again a second after Dataview's index or its own note changes; a hidden widget when it shows; one someone is typing in after they leave the field (typed text stays). `static followsChanges = false` draws it once (the pomodoro).
- Add a new one to `blocks` in `plugin/src/widgets/blocks.js`; a note shows it with a `winx` block (see [Dashboard](dashboard.md)).

## The calendar

The calendar tab is built the same way: its parts (`Header`, `Missed`, `Grid`, `Panel` in `plugin/src/calendar/parts.js`) are classes with `render()` (markup in `html`) and `on` (handlers by `data-action`); a task's row and card are components (`components.js`). Elements carry the task's key (`data-task`), so one set of listeners on the tab handles every click, tick, drag (`data-drag` → `data-drop`) and swipe (`data-swipeable`) and finds the task by it.

