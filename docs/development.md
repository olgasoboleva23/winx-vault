[← Docs](index.md)

# 🛠 Development

## 🗂 Structure

```
├── 📁 plugin — the Winx plugin
│   ├── 📁 src
│   │   ├── main.ts               — loads everything; the ```winx block, the dashboard and calendar tabs, ✨, the commands
│   │   ├── 📁 calendar           — the calendar tab: view.ts (state, redraws, one set of listeners), parts.js (Header,
│   │   │                           Missed, Grid, Panel), components.js (TaskText, TaskRow, TaskCard), data.js and
│   │   │                           state.js (the model and the tab's state, tested), actions.js (what it writes)
│   │   ├── 📁 dashboard          — the dashboard tab: view.ts (its date, the ✦ pill), layout.md (its cards)
│   │   ├── commands.ts           — the Cmd+P commands
│   │   ├── 📁 ui                 — form.ts (one window instead of a chain of prompts), html.js (markup in backticks),
│   │   │                           component.js (Component, Button, Card)
│   │   ├── 📁 lib                — config, goalsLib (week / goal / cycle / weight logic), task (one task line:
│   │   │                           read it, change it), items (watch / read / game notes), helpers
│   │   └── 📁 widgets            — widget.js (the base class), blocks.js (names → classes), one class per widget
│   ├── 📁 styles                 — Sass partials, built into the plugin's styles.css
│   └── 📁 tests                  — npm test; tests/obsidian/ checks styles inside Obsidian
├── 📁 00 System
│   ├── 📁 Assets                 — sounds, task stickers (stickers/)
│   ├── 📁 Data                   — Shop.md, Celestial Market.md, Supplies.md
│   ├── 📁 Scripts                — notify.js (desktop reminders, Templater startup), QuickAdd/MirrorMobileConfig.js
│   └── 📁 Templates              — Daily Note.md, recipe.md, task.md
├── 📁 02 Areas
│   ├── 📁 Health & Body/Cycle.md — cycle start dates
│   └── 📁 Personal
│       ├── Goals.md
│       ├── 📁 Daily Notes
│       └── 📁 Tasks              — Master.md (all tasks), Pool.md, Kanban.md
├── 📁 03 Resources/Collections   — Readlist, Gamelist, Watchlist, Recipes (Obsidian Bases)
├── Week.md, Mobile.md, 📁 Mobile
```

## Build and test

```sh
cd plugin
npm ci
npm test                                   # unit tests
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
      <span class="winx-weight-now">${d.last.kg} kg</span>
      ${new Button({ text: "✦ list", action: "list", kind: "pill" })}
    </div>`;
  }
  after(root, d) { this.keep(chart) }                            // what markup can't do (a chart)
}
```

- `html` escapes every value put in (a task with `<` or `&` can't break the markup); a nested `html` or a `Component` goes in as it is.
- `Button` and `Card` (`plugin/src/ui/component.js`) are the reusable parts: a button with a kind (`round`, `pill`, `cta`), an action and `data-*` values; a dashboard card with a title and the widget inside.
- A click on an element with `data-action="name"` (a change for an input, a submit for a form) calls `on.name`.
- The base draws the widget, and again a second after Dataview's index or its own note changes; a hidden widget when it shows; one someone is typing in after they leave the field (typed text stays). `static followsChanges = false` draws it once (the pomodoro).
- Add a new one to `blocks` in `plugin/src/widgets/blocks.js`; a note shows it with a `winx` block (see [Dashboard](dashboard.md)).

## The calendar

The calendar tab is built the same way: its parts (`Header`, `Missed`, `Grid`, `Panel` in `plugin/src/calendar/parts.js`) are classes with `render()` (markup in `html`) and `on` (handlers by `data-action`); a task's row and card are components (`components.js`). Elements carry the task's key (`data-task`), so one set of listeners on the tab handles every click, tick, drag (`data-drag` → `data-drop`) and swipe (`data-swipeable`) and finds the task by it.

