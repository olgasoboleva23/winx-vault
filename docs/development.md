[← Docs](index.md)

# 🛠 Development

## 🗂 Structure

```
├── 📁 plugin — the Winx plugin
│   ├── 📁 src
│   │   ├── main.ts               — loads everything; window.winx.render for the notes' blocks
│   │   ├── 📁 calendar           — the calendar tab: view.ts (state, redraws), data.js (the model, tested),
│   │   │                           state.js (tested), header, grid, panel, missed, card, drag, swipe, actions
│   │   ├── commands.ts           — the Cmd+P commands
│   │   ├── 📁 ui/form.ts         — one window of buttons / text boxes instead of a chain of prompts
│   │   ├── 📁 lib                — config, goalsLib (week / goal / cycle / weight logic), task (one task line:
│   │   │                           read it, change it), items (watch / read / game notes), helpers
│   │   └── 📁 widgets            — one file per widget, render(dv, input)
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
├── Dashboard.md, Week.md, Mobile.md, 📁 Mobile
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
